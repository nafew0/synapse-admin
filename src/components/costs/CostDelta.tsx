import { percentOf } from '@/utils';
import { useLocalize } from '@/hooks';

/** Change against the previous period. More spend is the warning tone, less is the good one. */
export function CostDelta({ change, suffix }: { change: number | null; suffix: string }) {
  const localize = useLocalize();
  if (change == null) {
    return (
      <span className="text-xs text-(--cui-color-text-muted)">
        {localize('com_costs_no_previous')}
      </span>
    );
  }
  const up = change > 0;
  const flat = change === 0;
  const tone = up ? 'text-(--syn-warning-fg)' : 'text-(--syn-success-fg)';
  return (
    <span className={`text-xs font-semibold ${flat ? 'text-(--cui-color-text-muted)' : tone}`}>
      {flat ? null : <span aria-hidden="true">{up ? '▲ ' : '▼ '}</span>}
      {flat ? null : (
        <span className="sr-only">{localize(up ? 'com_chart_up' : 'com_chart_down')} </span>
      )}
      {`${percentOf(change)}% ${suffix}`}
    </span>
  );
}
