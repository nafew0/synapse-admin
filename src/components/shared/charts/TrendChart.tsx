import { useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import type * as t from '@/types';
import { rollingAverage } from '@/utils';
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
}: t.TrendChartProps) {
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
      xPercent: (i: number) => (i / last) * 100,
      yPercent: (v: number) => 100 - (v / top) * 100,
    };
  }, [averageWindow, data, height]);

  if (data.length === 0) {
    return null;
  }

  const pickFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) {
      return;
    }
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    setActive(Math.round(ratio * (data.length - 1)));
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
          <div className="absolute inset-x-0 top-0 border-t border-(--syn-track)" />
          <div className="absolute inset-x-0 top-1/2 border-t border-(--syn-track)" />
          <div className="absolute inset-x-0 bottom-0 border-t border-(--cui-color-stroke-default)" />
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
          {activeDatum ? (
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
            className="absolute whitespace-nowrap"
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
