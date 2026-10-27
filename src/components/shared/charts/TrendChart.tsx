import { useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import type * as t from '@/types';
import { rollingAverage, cn } from '@/utils';
import { useLocalize } from '@/hooks';

const VIEW_WIDTH = 1000;
const AVERAGE_DELAY_MS = 350;
const AXIS_LABEL_COUNT = 5;

function niceCeiling(value: number): number {
  if (value <= 0) {
    return 1;
  }
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= value) ?? 10;
  return step * magnitude;
}

function buildPath(values: Array<number | null>, x: (i: number) => number, y: (v: number) => number): string {
  let path = '';
  let drawing = false;
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (value == null) {
      drawing = false;
      continue;
    }
    path += `${drawing ? 'L' : 'M'}${x(i).toFixed(1)},${y(value).toFixed(1)} `;
    drawing = true;
  }
  return path.trim();
}

function axisIndices(length: number): number[] {
  if (length <= AXIS_LABEL_COUNT) {
    return Array.from({ length }, (_, i) => i);
  }
  return Array.from({ length: AXIS_LABEL_COUNT }, (_, i) =>
    Math.round((i * (length - 1)) / (AXIS_LABEL_COUNT - 1)),
  );
}

function labelShift(position: number, count: number): string {
  if (position === 0) {
    return 'none';
  }
  return position === count - 1 ? 'translateX(-100%)' : 'translateX(-50%)';
}

/**
 * Daily series as a filled line with a trailing average, so weekday/weekend
 * swings don't hide the direction. Pointer and arrow keys move a crosshair.
 */
export function TrendChart({
  data,
  label,
  averageLabel,
  formatValue,
  formatDay,
  detailRows,
  height = 240,
  averageWindow = 7,
  variant = 'line',
}: t.TrendChartProps) {
  const bars = variant === 'bars';
  const localize = useLocalize();
  const plotRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const geometry = useMemo(() => {
    const values = data.map((datum) => datum.value);
    const averages = rollingAverage(values, averageWindow);
    const top = niceCeiling(Math.max(...values, 0));
    const last = Math.max(data.length - 1, 1);
    const x = (i: number) => (i / last) * VIEW_WIDTH;
    const y = (v: number) => height - (v / top) * height;
    const line = buildPath(values, x, y);
    return {
      top,
      averages,
      line,
      area: line ? `${line} L${VIEW_WIDTH},${height} L0,${height} Z` : '',
      average: buildPath(averages, x, y),
      /** Bars sit in the middle of equal day slots; the line runs edge to edge. */
      xPercent: (i: number) => (bars ? ((i + 0.5) / data.length) * 100 : (i / last) * 100),
      yPercent: (v: number) => 100 - (v / top) * 100,
    };
  }, [averageWindow, bars, data, height]);

  if (data.length === 0) {
    return null;
  }

  const pickFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) {
      return;
    }
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    setActive(
      bars
        ? Math.min(Math.floor(ratio * data.length), data.length - 1)
        : Math.round(ratio * (data.length - 1)),
    );
  };

  const moveWithKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = active ?? data.length - 1;
    const next: Record<string, number> = {
      ArrowLeft: Math.max(current - 1, 0),
      ArrowRight: Math.min(current + 1, data.length - 1),
      Home: 0,
      End: data.length - 1,
    };
    if (event.key === 'Escape') {
      setActive(null);
      return;
    }
    if (!(event.key in next)) {
      return;
    }
    event.preventDefault();
    setActive(next[event.key]);
  };

  /** A new series (metric switch, new range) redraws instead of snapping in place. */
  const drawKey = `${label}:${data[0].day}:${data.length}`;
  const activeDatum = active == null ? null : data[active];
  const activeAverage = active == null ? null : geometry.averages[active];
  const flip = active != null && active > (data.length - 1) * 0.6;

  return (
    <figure className="m-0 flex flex-col gap-2">
      <div className="flex gap-3">
        <div
          aria-hidden="true"
          className="flex w-11 shrink-0 flex-col justify-between text-right text-[11px] text-(--cui-color-text-muted) tabular-nums"
          style={{ height }}
        >
          <span>{formatValue(geometry.top)}</span>
          <span>{formatValue(geometry.top / 2)}</span>
          <span>0</span>
        </div>
        <div
          ref={plotRef}
          role="group"
          tabIndex={0}
          aria-label={label}
          aria-roledescription="chart"
          onPointerMove={pickFromPointer}
          onPointerLeave={() => setActive(null)}
          onKeyDown={moveWithKeys}
          onBlur={() => setActive(null)}
          className="relative flex-1 touch-none rounded-sm outline-offset-4"
          style={{ height }}
        >
          <div className={cn('absolute inset-x-0 top-0 border-t border-(--syn-track)', bars && 'border-dashed')} />
          <div className={cn('absolute inset-x-0 top-1/2 border-t border-(--syn-track)', bars && 'border-dashed')} />
          <div className="absolute inset-x-0 bottom-0 border-t border-(--cui-color-stroke-default)" />
          {bars ? (
            <BarPlot
              key={drawKey}
              data={data}
              active={active}
              top={geometry.top}
              xPercent={geometry.xPercent}
            />
          ) : null}
          {bars ? null : (
            <>
          <svg
            key={drawKey}
            aria-hidden="true"
            viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
            preserveAspectRatio="none"
            className="syn-reveal absolute inset-0 h-full w-full overflow-visible"
          >
            <path d={geometry.area} style={{ fill: 'var(--syn-chart-1)', fillOpacity: 0.14 }} />
            <path
              d={geometry.line}
              fill="none"
              strokeWidth={2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              style={{ stroke: 'var(--syn-chart-1)' }}
            />
          </svg>
          <svg
            key={`${drawKey}-average`}
            aria-hidden="true"
            viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
            preserveAspectRatio="none"
            className="syn-reveal absolute inset-0 h-full w-full overflow-visible"
            style={{ '--syn-delay': `${AVERAGE_DELAY_MS}ms` } as CSSProperties}
          >
            <path
              d={geometry.average}
              fill="none"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              style={{ stroke: 'var(--syn-chart-avg)' }}
            />
          </svg>
            </>
          )}
          {activeDatum && bars ? (
            <BarTooltip
              day={formatDay(activeDatum.day)}
              label={label}
              value={formatValue(activeDatum.value)}
              averageLabel={averageLabel}
              average={activeAverage == null ? '—' : formatValue(activeAverage)}
              detailRows={detailRows?.(active ?? 0) ?? []}
              left={geometry.xPercent(active ?? 0)}
              barTop={geometry.yPercent(activeDatum.value)}
            />
          ) : null}
          {activeDatum && !bars ? (
            <>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 border-l border-(--cui-color-stroke-intense)"
                style={{ left: `${geometry.xPercent(active ?? 0)}%` }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -mt-1.25 -ml-1.25 h-2.5 w-2.5 rounded-full bg-(--syn-chart-1) shadow-[0_0_0_2px_var(--syn-surface)]"
                style={{
                  left: `${geometry.xPercent(active ?? 0)}%`,
                  top: `${geometry.yPercent(activeDatum.value)}%`,
                }}
              />
              <div
                role="status"
                className="pointer-events-none absolute top-2 z-10 min-w-44 rounded-lg border border-(--cui-color-stroke-default) bg-(--syn-surface) px-3 py-2.5 text-xs shadow-lg"
                style={{
                  left: `${geometry.xPercent(active ?? 0)}%`,
                  transform: flip ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)',
                }}
              >
                <div className="mb-1.5 font-semibold text-(--cui-color-text-default)">
                  {formatDay(activeDatum.day)}
                </div>
                <dl className="m-0 grid grid-cols-[auto_auto] gap-x-4 gap-y-1 tabular-nums">
                  <dt className="text-(--cui-color-text-muted)">{label}</dt>
                  <dd className="m-0 text-right font-semibold">{formatValue(activeDatum.value)}</dd>
                  <dt className="text-(--cui-color-text-muted)">{averageLabel}</dt>
                  <dd className="m-0 text-right font-semibold">
                    {activeAverage == null ? '—' : formatValue(activeAverage)}
                  </dd>
                  {(detailRows?.(active ?? 0) ?? []).map((row) => (
                    <div key={row.label} className="contents">
                      <dt className="text-(--cui-color-text-muted)">{row.label}</dt>
                      <dd className="m-0 text-right font-semibold">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </>
          ) : null}
        </div>
      </div>
      <div
        aria-hidden="true"
        className="relative ml-14 h-4 text-[11px] text-(--cui-color-text-muted)"
      >
        {axisIndices(data.length).map((index, position, all) => (
          <span
            key={data[index].day}
            className={cn('absolute whitespace-nowrap', position % 2 === 1 && 'hidden sm:inline')}
            style={{
              left: `${geometry.xPercent(index)}%`,
              transform: labelShift(position, all.length),
            }}
          >
            {formatDay(data[index].day)}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">{localize('com_chart_day')}</th>
            <th scope="col">{label}</th>
            <th scope="col">{averageLabel}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((datum, index) => (
            <tr key={datum.day}>
              <td>{formatDay(datum.day)}</td>
              <td>{formatValue(datum.value)}</td>
              <td>{geometry.averages[index] == null ? '' : formatValue(geometry.averages[index] ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** One bar per day; the hovered bar brightens and gets a marker at its top. */
function BarPlot({
  data,
  active,
  top,
  xPercent,
}: {
  data: t.TrendDatum[];
  active: number | null;
  top: number;
  xPercent: (index: number) => number;
}) {
  const slot = 100 / Math.max(data.length, 1);
  return (
    <div aria-hidden="true" className="absolute inset-0">
      {data.map((datum, index) => {
        const height = top > 0 ? (datum.value / top) * 100 : 0;
        const isActive = index === active;
        return (
          <div
            key={datum.day}
            className="absolute bottom-0"
            style={{
              left: `${xPercent(index)}%`,
              width: `max(2px, calc(${slot}% * 0.55))`,
              height: datum.value > 0 ? `max(2px, ${height}%)` : 0,
              transform: 'translateX(-50%)',
            }}
          >
            <div
              className={cn(
                'syn-bar-rise h-full w-full rounded-t-[3px] bg-(--syn-chart-1) transition-[filter,opacity] duration-150',
                active != null && !isActive && 'opacity-80',
                isActive && 'brightness-125',
              )}
              style={{ '--syn-delay': `${Math.min(index * 12, 360)}ms` } as CSSProperties}
            />
            {isActive ? (
              <span className="absolute -top-1.25 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-(--syn-surface) bg-(--syn-chart-1)" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Centred over the bar, or anchored to it near either edge so it stays in the plot. */
function tooltipShift(left: number): string {
  if (left < 18) {
    return '-12px';
  }
  return left > 82 ? 'calc(-100% + 12px)' : '-50%';
}

/**
 * Sits above the hovered bar with a dashed stem down to it; beside the bar when
 * the bar is too tall to leave room above. Kept inside the plot at either edge.
 */
function BarTooltip({
  day,
  label,
  value,
  averageLabel,
  average,
  detailRows,
  left,
  barTop,
}: {
  day: string;
  label: string;
  value: string;
  averageLabel: string;
  average: string;
  detailRows: t.TrendTooltipRow[];
  left: number;
  barTop: number;
}) {
  const above = barTop > 45;
  const shift = tooltipShift(left);
  return (
    <div
      className="pointer-events-none absolute inset-y-0"
      style={{ left: `${left}%` }}
    >
      {above ? (
        <span
          aria-hidden="true"
          className="absolute h-4 border-l border-dashed border-(--cui-color-stroke-intense)"
          style={{ top: `calc(${barTop}% - 18px)` }}
        />
      ) : null}
      <div
        role="status"
        className="absolute z-10 min-w-44 rounded-lg border border-(--cui-color-stroke-default) bg-(--syn-surface) px-3 py-2.5 text-xs whitespace-nowrap shadow-lg"
        style={
          above
            ? { bottom: `calc(${100 - barTop}% + 18px)`, transform: `translateX(${shift})` }
            : { top: 8, transform: left > 60 ? 'translateX(calc(-100% - 14px))' : 'translateX(14px)' }
        }
      >
        <div className="mb-1.5 text-(--cui-color-text-muted)">{day}</div>
        <dl className="m-0 grid grid-cols-[auto_auto] items-center gap-x-5 gap-y-1 tabular-nums">
          <dt className="flex items-center gap-1.5 text-(--cui-color-text-default)">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-(--syn-chart-1)" />
            {label}
          </dt>
          <dd className="m-0 text-right text-[13px] font-bold">{value}</dd>
          <dt className="pl-3.5 text-(--cui-color-text-muted)">{averageLabel}</dt>
          <dd className="m-0 text-right text-(--cui-color-text-muted)">{average}</dd>
          {detailRows.map((row) => (
            <div key={row.label} className="contents">
              <dt className="pl-3.5 text-(--cui-color-text-muted)">{row.label}</dt>
              <dd className="m-0 text-right text-(--cui-color-text-muted)">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
