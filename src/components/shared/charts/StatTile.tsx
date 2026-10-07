import type * as t from '@/types';
import { percentChange } from '@/utils';
import { useLocalize } from '@/hooks';

export function StatTile({ label, value, icon, detail, children }: t.StatTileProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-(--cui-color-stroke-default) bg-(--syn-surface) p-4">
      <div className="flex items-center gap-2 text-(--cui-color-text-muted)">
        {icon ? (
          <span aria-hidden="true" className="flex shrink-0">
            {icon}
          </span>
        ) : null}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-2xl leading-none font-bold tracking-tight text-(--cui-color-text-default)">
            {value}
          </span>
          {detail ? <span className="text-xs text-(--cui-color-text-muted)">{detail}</span> : null}
        </div>
        {children}
      </div>
    </div>
  );
}

function deltaTone(change: number): { className: string; arrow: string; key: 'com_chart_up' | 'com_chart_down' | null } {
  if (change > 0) {
    return { className: 'text-(--syn-success-fg)', arrow: '▲', key: 'com_chart_up' };
  }
  if (change < 0) {
    return { className: 'text-(--syn-danger-fg)', arrow: '▼', key: 'com_chart_down' };
  }
  return { className: 'text-(--cui-color-text-muted)', arrow: '', key: null };
}

/** Change against the previous period; hidden when there is nothing to compare with. */
export function Delta({ current, previous, suffix }: t.DeltaProps) {
  const localize = useLocalize();
  const change = percentChange(current, previous);
  if (change == null) {
    return null;
  }
  const tone = deltaTone(change);
  return (
    <span className={`text-xs font-semibold ${tone.className}`}>
      {tone.arrow ? <span aria-hidden="true">{tone.arrow} </span> : null}
      {tone.key ? <span className="sr-only">{localize(tone.key)} </span> : null}
      {`${Math.abs(change)}% ${suffix}`}
    </span>
  );
}
