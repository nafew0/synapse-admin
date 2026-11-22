import type * as t from '@/types';
import {
  cn,
  diffLabel,
  formatDiffValue,
  formatSignedPct,
  formatSignedRate,
  tierLabel,
} from '@/utils';
import { useLocalize } from '@/hooks';

function ChangeCell({ line }: { line: t.PriceDiffLine }) {
  const localize = useLocalize();
  if (line.kind === 'added') return <>{localize('com_prices_diff_added')}</>;
  if (line.kind === 'removed') return <>{localize('com_prices_diff_removed')}</>;
  if (line.kind === 'unchanged' || line.change == null) return <>—</>;
  const text =
    line.field === 'contextLength'
      ? line.change.toLocaleString('en-US')
      : formatSignedRate(line.change);
  const pct = line.changePct == null ? '' : ` (${formatSignedPct(line.changePct)})`;
  return (
    <span className={line.change > 0 ? 'text-(--syn-warning-fg)' : 'text-(--syn-success-fg)'}>
      {text}
      {pct}
    </span>
  );
}

function FieldName({ field }: { field: string }) {
  const localize = useLocalize();
  const label = diffLabel(field);
  const name = localize(label.key);
  if (label.tier == null) return <>{name}</>;
  return <>{localize('com_prices_tier_field', { field: name, tokens: tierLabel(label.tier) })}</>;
}

/** Previous against current, one line per field; unchanged lines are the caller's to hide. */
export function DiffTable({ lines, className }: { lines: t.PriceDiffLine[]; className?: string }) {
  const localize = useLocalize();
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-left text-[13px] tabular-nums">
        <thead>
          <tr className="text-xs text-(--cui-color-text-muted)">
            <th scope="col" className="py-2 pr-3 font-medium">
              {localize('com_prices_diff_field')}
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              {localize('com_prices_diff_previous')}
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              {localize('com_prices_diff_current')}
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              {localize('com_prices_diff_change')}
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr
              key={line.field}
              data-kind={line.kind}
              className="border-t border-(--cui-color-stroke-muted)"
            >
              <th scope="row" className="py-2 pr-3 font-medium">
                <FieldName field={line.field} />
              </th>
              <td className="py-2 pr-3 text-right">{formatDiffValue(line.field, line.previous)}</td>
              <td className="py-2 pr-3 text-right">{formatDiffValue(line.field, line.current)}</td>
              <td className="py-2 text-right">
                <ChangeCell line={line} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
