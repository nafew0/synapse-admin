import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type * as t from '@/types';
import { formatCompact, formatWeekday, localDay, weekdayAverages } from '@/utils';
import { BAR_STAGGER_MS } from '@/components/shared';
import { useLocalize } from '@/hooks';

const CHART_HEIGHT = 150;
const START_DELAY_MS = 150;

/**
 * Average daily tokens for each weekday across the series it is given. The busiest day
 * is emphasised and labelled; the rest stay muted, with values in the table.
 */
export function WeekdayUsage({ series }: { series: t.TrendDatum[] }) {
  const localize = useLocalize();
  const averages = useMemo(() => weekdayAverages(series, [localDay()]), [series]);
  const busiest = averages.reduce<t.WeekdayAverage | null>(
    (best, day) => (day.average > (best?.average ?? 0) ? day : best),
    null,
  );
  const peak = busiest?.average ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-[13px] text-(--cui-color-text-muted)">
        {busiest
          ? localize('com_dash_weekday_desc', {
              day: formatWeekday(busiest.weekday, 'long'),
              tokens: formatCompact(busiest.average),
            })
          : localize('com_dash_weekday_desc_empty')}
      </p>
      {busiest == null ? (
        <p className="m-0 py-6 text-center text-sm text-(--cui-color-text-muted)">
          {localize('com_dash_no_usage')}
        </p>
      ) : (
        <figure className="m-0 flex flex-col gap-2">
          <div
            aria-hidden="true"
            className="grid grid-cols-7 items-end gap-2 border-b border-(--cui-color-stroke-default)"
            style={{ height: CHART_HEIGHT + 22 }}
          >
            {averages.map((day, order) => {
              const isBusiest = day.weekday === busiest.weekday;
              const height = peak > 0 ? Math.max((day.average / peak) * CHART_HEIGHT, day.average > 0 ? 3 : 0) : 0;
              return (
                <div
                  key={day.weekday}
                  title={`${formatWeekday(day.weekday, 'long')}: ${formatCompact(day.average)}`}
                  className="flex h-full flex-col items-center justify-end gap-1"
                >
                  {isBusiest ? (
                    <span className="text-[11px] font-bold text-(--cui-color-text-default) tabular-nums">
                      {formatCompact(day.average)}
                    </span>
                  ) : null}
                  <div
                    className="syn-bar-rise w-full max-w-9 rounded-t-md"
                    style={
                      {
                        height,
                        background: 'var(--syn-chart-1)',
                        opacity: isBusiest ? 1 : 0.4,
                        '--syn-delay': `${START_DELAY_MS + order * BAR_STAGGER_MS}ms`,
                      } as CSSProperties
                    }
                  />
                </div>
              );
            })}
          </div>
          <div aria-hidden="true" className="grid grid-cols-7 gap-2 text-center text-[11px]">
            {averages.map((day) => (
              <span
                key={day.weekday}
                className={
                  day.weekday === busiest.weekday
                    ? 'font-bold text-(--cui-color-text-default)'
                    : 'text-(--cui-color-text-muted)'
                }
              >
                {formatWeekday(day.weekday)}
              </span>
            ))}
          </div>
          <table className="sr-only">
            <caption>{localize('com_dash_weekday_title')}</caption>
            <thead>
              <tr>
                <th scope="col">{localize('com_dash_weekday_day')}</th>
                <th scope="col">{localize('com_dash_weekday_average')}</th>
              </tr>
            </thead>
            <tbody>
              {averages.map((day) => (
                <tr key={day.weekday}>
                  <td>{formatWeekday(day.weekday, 'long')}</td>
                  <td>{formatCompact(day.average)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="m-0 text-xs text-(--cui-color-text-muted)">{localize('com_dash_weekday_note')}</p>
        </figure>
      )}
    </div>
  );
}
