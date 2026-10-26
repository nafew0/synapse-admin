import type { CSSProperties } from 'react';
import type * as t from '@/types';
import { formatCompact, formatWeekday, cn } from '@/utils';
import { BAR_STAGGER_MS } from '@/components/shared';
import { useLocalize } from '@/hooks';

const CHART_HEIGHT = 190;
const START_DELAY_MS = 250;
const FUTURE_MIN_HEIGHT = 12;

function barHeight(value: number, peak: number): number {
  if (peak <= 0 || value <= 0) {
    return 0;
  }
  return Math.max((value / peak) * CHART_HEIGHT, 3);
}

function DayValue({ value, isFuture, noneYet }: { value: number; isFuture: boolean; noneYet: boolean }) {
  const localize = useLocalize();
  if (isFuture) {
    return null;
  }
  if (!noneYet) {
    return formatCompact(value);
  }
  return (
    <>
      <span className="sm:hidden">0</span>
      <span className="hidden sm:inline">{localize('com_dash_week_none_yet')}</span>
    </>
  );
}

function DayBar({
  height,
  isFuture,
  isToday,
  noneYet,
  delay,
}: {
  height: number;
  isFuture: boolean;
  isToday: boolean;
  noneYet: boolean;
  delay: number;
}) {
  if (isFuture) {
    return null;
  }
  if (noneYet) {
    return <div className="relative h-0.5 w-[78%] rounded-full bg-(--syn-chart-1)" />;
  }
  return (
    <div
      className="syn-bar-rise relative w-[78%] rounded-t-md bg-(--syn-chart-1)"
      style={{ height, opacity: isToday ? 0.75 : 1, '--syn-delay': `${delay}ms` } as CSSProperties}
    />
  );
}

/**
 * Monday to Sunday of the current week, each day's tokens set against the
 * same weekday last week (the tinted ghost behind it), so the week always has a
 * shape even before anyone uses Synapse. Days still to come show only a dimmed
 * ghost; today with no usage yet says so instead of drawing nothing.
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
          const noneYet = isToday && day.value === 0;
          const previous = lastWeek[order]?.value ?? 0;
          return (
            <div
              key={day.day}
              title={`${formatWeekday(order === 6 ? 0 : order + 1, 'long')}: ${formatCompact(day.value)} · ${localize('com_dash_week_last', { value: formatCompact(previous) })}`}
              className="relative flex h-full flex-col items-center justify-end gap-1"
            >
              <span
                className={cn(
                  'text-[11px] font-bold whitespace-nowrap tabular-nums',
                  isFuture || noneYet ? 'text-(--cui-color-text-muted)' : 'text-(--cui-color-text-default)',
                )}
              >
                <DayValue value={day.value} isFuture={isFuture} noneYet={noneYet} />
              </span>
              <div className="relative flex w-full max-w-14 items-end justify-center" style={{ height: CHART_HEIGHT }}>
                <div
                  className={cn(
                    'absolute bottom-0 w-full rounded-t-md border border-b-0 border-dashed border-(--syn-ghost) bg-(--syn-ghost-fill)',
                    isFuture && 'opacity-60',
                  )}
                  style={{ height: Math.max(barHeight(previous, peak), isFuture ? FUTURE_MIN_HEIGHT : 0) }}
                />
                <DayBar
                  height={barHeight(day.value, peak)}
                  isFuture={isFuture}
                  isToday={isToday}
                  noneYet={noneYet}
                  delay={START_DELAY_MS + order * BAR_STAGGER_MS}
                />
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
