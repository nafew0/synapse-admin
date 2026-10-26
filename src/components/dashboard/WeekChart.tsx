import type { CSSProperties } from 'react';
import type * as t from '@/types';
import { formatCompact, formatWeekday, cn } from '@/utils';
import { BAR_STAGGER_MS } from '@/components/shared';
import { useLocalize } from '@/hooks';

const CHART_HEIGHT = 190;
const START_DELAY_MS = 250;
const FUTURE_MIN_HEIGHT = 12;
/** Days still ahead are hatched so "not yet" never reads as zero usage. */
const FUTURE_HATCH =
  'repeating-linear-gradient(135deg, var(--syn-track) 0 4px, transparent 4px 8px)';

function barHeight(value: number, peak: number): number {
  if (peak <= 0 || value <= 0) {
    return 0;
  }
  return Math.max((value / peak) * CHART_HEIGHT, 3);
}

/**
 * Monday to Sunday of the current week, each day's tokens set against the
 * same weekday last week (the outlined ghost behind it). Days still to come
 * show as an empty slot, so the week reads as "how far through" at a glance.
 */
export function WeekChart({ thisWeek, lastWeek, today }: t.WeekChartProps) {
  const localize = useLocalize();
  const peak = Math.max(...thisWeek.map((day) => day.value), ...lastWeek.map((day) => day.value), 0);

  return (
    <figure className="m-0 flex flex-col gap-2">
      <div
        aria-hidden="true"
        className="grid grid-cols-7 items-end gap-3 border-b border-(--cui-color-stroke-default) px-1"
        style={{ height: CHART_HEIGHT + 24 }}
      >
        {thisWeek.map((day, order) => {
          const isToday = day.day === today;
          const isFuture = day.day > today;
          const previous = lastWeek[order]?.value ?? 0;
          return (
            <div
              key={day.day}
              title={`${formatWeekday(order === 6 ? 0 : order + 1, 'long')}: ${formatCompact(day.value)} · ${localize('com_dash_week_last', { value: formatCompact(previous) })}`}
              className="relative flex h-full flex-col items-center justify-end gap-1"
            >
              <span
                className={cn(
                  'text-[11px] font-bold tabular-nums',
                  isFuture ? 'text-(--cui-color-text-muted)' : 'text-(--cui-color-text-default)',
                )}
              >
                {isFuture ? '' : formatCompact(day.value)}
              </span>
              <div className="relative flex w-full max-w-14 items-end justify-center" style={{ height: CHART_HEIGHT }}>
                <div
                  className="absolute bottom-0 w-full rounded-t-md border border-b-0 border-dashed border-(--syn-ghost)"
                  style={{
                    height: Math.max(barHeight(previous, peak), isFuture ? FUTURE_MIN_HEIGHT : 0),
                    backgroundImage: isFuture ? FUTURE_HATCH : undefined,
                  }}
                />
                {isFuture ? null : (
                  <div
                    className="syn-bar-rise relative w-[78%] rounded-t-md bg-(--syn-chart-1)"
                    style={
                      {
                        height: barHeight(day.value, peak),
                        opacity: isToday ? 0.75 : 1,
                        '--syn-delay': `${START_DELAY_MS + order * BAR_STAGGER_MS}ms`,
                      } as CSSProperties
                    }
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div aria-hidden="true" className="grid grid-cols-7 gap-3 px-1 text-center text-[11px]">
        {thisWeek.map((day, order) => (
          <span
            key={day.day}
            className={
              day.day === today
                ? 'font-bold text-(--cui-color-text-default)'
                : 'text-(--cui-color-text-muted)'
            }
          >
            <span className="whitespace-nowrap">{formatWeekday(order === 6 ? 0 : order + 1)}</span>
            {day.day === today ? (
              <span className="block whitespace-nowrap text-(--syn-brand-ink) sm:inline">
                <span className="hidden sm:inline"> · </span>
                {localize('com_dash_week_today')}
              </span>
            ) : null}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{localize('com_dash_week_title')}</caption>
        <thead>
          <tr>
            <th scope="col">{localize('com_dash_weekday_day')}</th>
            <th scope="col">{localize('com_dash_week_this')}</th>
            <th scope="col">{localize('com_dash_week_last_col')}</th>
          </tr>
        </thead>
        <tbody>
          {thisWeek.map((day, order) => (
            <tr key={day.day}>
              <td>{formatWeekday(order === 6 ? 0 : order + 1, 'long')}</td>
              <td>{day.day > today ? '—' : formatCompact(day.value)}</td>
              <td>{formatCompact(lastWeek[order]?.value ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
