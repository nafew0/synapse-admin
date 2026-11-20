import { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';

const AXIS_LABEL_COUNT = 5;

function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= value) ?? 10;
  return step * magnitude;
}

function axisIndices(length: number): number[] {
  if (length <= AXIS_LABEL_COUNT) return Array.from({ length }, (_, i) => i);
  return Array.from({ length: AXIS_LABEL_COUNT }, (_, i) =>
    Math.round((i * (length - 1)) / (AXIS_LABEL_COUNT - 1)),
  );
}

function labelShift(position: number, count: number): string {
  if (position === 0) return 'none';
  return position === count - 1 ? 'translateX(-100%)' : 'translateX(-50%)';
}

/**
 * One bar per day, split into the series that make it up (a service, an institution).
 * Pointer or arrow keys pick a day and list each series' share in a tooltip.
 */
export function StackedBars({
  days,
  series,
  label,
  formatValue,
  formatDay,
  height = 240,
}: t.StackedBarsProps) {
  const localize = useLocalize();
  const [active, setActive] = useState<number | null>(null);

  const geometry = useMemo(() => {
    const totals = days.map((_, i) => series.reduce((sum, item) => sum + (item.values[i] ?? 0), 0));
    return { totals, top: niceCeiling(Math.max(...totals, 0)) };
  }, [days, series]);

  if (days.length === 0) return null;

  const moveWithKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = active ?? days.length - 1;
    const next: Record<string, number> = {
      ArrowLeft: Math.max(current - 1, 0),
      ArrowRight: Math.min(current + 1, days.length - 1),
      Home: 0,
      End: days.length - 1,
    };
    if (event.key === 'Escape') {
      setActive(null);
      return;
    }
    if (!(event.key in next)) return;
    event.preventDefault();
    setActive(next[event.key]);
  };

  const flip = active != null && active > (days.length - 1) * 0.6;
  const left = active == null ? 0 : ((active + 0.5) / days.length) * 100;

  return (
    <figure className="m-0 flex flex-col gap-2">
      <div className="flex gap-3">
        <div
          aria-hidden="true"
          className="flex w-14 shrink-0 flex-col justify-between text-right text-[11px] text-(--cui-color-text-muted) tabular-nums"
          style={{ height }}
        >
          <span>{formatValue(geometry.top)}</span>
          <span>{formatValue(geometry.top / 2)}</span>
          <span>0</span>
        </div>
        <div
          role="group"
          tabIndex={0}
          aria-label={label}
          aria-roledescription="chart"
          onPointerLeave={() => setActive(null)}
          onKeyDown={moveWithKeys}
          onBlur={() => setActive(null)}
          className="relative flex flex-1 items-end gap-px rounded-sm outline-offset-4"
          style={{ height }}
        >
          <div className="absolute inset-x-0 top-0 border-t border-dashed border-(--syn-track)" />
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-(--syn-track)" />
          <div className="absolute inset-x-0 bottom-0 border-t border-(--cui-color-stroke-default)" />
          {days.map((day, index) => (
            <div
              key={day}
              data-testid="stacked-bar"
              onPointerEnter={() => setActive(index)}
              onPointerMove={() => setActive(index)}
              className={cn(
                'relative z-1 flex h-full flex-1 flex-col-reverse justify-start',
                active === index && 'bg-(--syn-brand-tint)',
              )}
            >
              {series.map((item) => {
                const value = item.values[index] ?? 0;
                if (value <= 0) return null;
                return (
                  <div
                    key={item.key}
                    style={{ height: `${(value / geometry.top) * 100}%`, background: item.color }}
                    className="min-h-px w-full"
                  />
                );
              })}
            </div>
          ))}
          {active != null ? (
            <div
              role="status"
              className="pointer-events-none absolute top-2 z-10 min-w-48 rounded-lg border border-(--cui-color-stroke-default) bg-(--syn-surface) px-3 py-2.5 text-xs shadow-lg"
              style={{
                left: `${left}%`,
                transform: flip ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)',
              }}
            >
              <div className="mb-1.5 font-semibold text-(--cui-color-text-default)">
                {formatDay(days[active])}
              </div>
              <dl className="m-0 grid grid-cols-[auto_auto] gap-x-4 gap-y-1 tabular-nums">
                {series
                  .filter((item) => (item.values[active] ?? 0) > 0)
                  .map((item) => (
                    <div key={item.key} className="contents">
                      <dt className="flex items-center gap-1.5 text-(--cui-color-text-muted)">
                        <span
                          aria-hidden="true"
                          className="h-2 w-2 rounded-xs"
                          style={{ background: item.color }}
                        />
                        {item.label}
                      </dt>
                      <dd className="m-0 text-right font-semibold">
                        {formatValue(item.values[active] ?? 0)}
                      </dd>
                    </div>
                  ))}
                <dt className="border-t border-(--cui-color-stroke-muted) pt-1 font-semibold">
                  {localize('com_costs_total')}
                </dt>
                <dd className="m-0 border-t border-(--cui-color-stroke-muted) pt-1 text-right font-semibold">
                  {formatValue(geometry.totals[active])}
                </dd>
              </dl>
            </div>
          ) : null}
        </div>
      </div>
      <div
        aria-hidden="true"
        className="relative ml-17 h-4 text-[11px] text-(--cui-color-text-muted)"
      >
        {axisIndices(days.length).map((index, position, all) => (
          <span
            key={days[index]}
            className={cn('absolute whitespace-nowrap', position % 2 === 1 && 'hidden sm:inline')}
            style={{
              left: `${((index + 0.5) / days.length) * 100}%`,
              transform: labelShift(position, all.length),
            }}
          >
            {formatDay(days[index])}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">{localize('com_chart_day')}</th>
            {series.map((item) => (
              <th key={item.key} scope="col">
                {item.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day, index) => (
            <tr key={day}>
              <td>{formatDay(day)}</td>
              {series.map((item) => (
                <td key={item.key}>{formatValue(item.values[index] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
