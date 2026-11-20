import { useMemo, useState } from 'react';
import type * as t from '@/types';
import { formatBdt, formatCompact, formatShare, formatUsd, serviceLabelKey } from '@/utils';
import { Card, EmptyState } from '@/components/shared';
import { useLocalize } from '@/hooks';
import { CostDelta } from './CostDelta';

type SortKey = 'cost' | 'members' | 'perMember' | 'change';

const SORTERS: Record<SortKey, (row: t.CostInstitutionRow) => number> = {
  cost: (row) => row.cost.costUsd,
  members: (row) => row.activeMembers,
  perMember: (row) => row.costPerActiveMember ?? -1,
  change: (row) => row.changeVsPrevious ?? -1e12,
};

const biggestService = (byService: t.CostByService): string | null =>
  Object.entries(byService).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

function SortButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`cursor-pointer border-0 bg-transparent p-0 text-xs font-medium ${
        active ? 'text-(--syn-brand-ink)' : 'text-(--cui-color-text-muted)'
      } hover:text-(--cui-color-text-default)`}
    >
      {label}
      {active ? ' ↓' : ''}
    </button>
  );
}

interface InstitutionsProps {
  institutions: t.CostInstitutionRow[];
  onOpen: (row: t.CostInstitutionRow) => void;
}

/** All institutions, plus Individuals and Platform; sortable, each row opens its cost view. */
export function InstitutionTable({ institutions, onOpen }: InstitutionsProps) {
  const localize = useLocalize();
  const [sort, setSort] = useState<SortKey>('cost');
  const rows = useMemo(
    () => [...institutions].sort((a, b) => SORTERS[sort](b) - SORTERS[sort](a)),
    [institutions, sort],
  );
  const head = (key: SortKey, label: string) => (
    <SortButton active={sort === key} label={label} onClick={() => setSort(key)} />
  );

  return (
    <Card
      title={localize('com_costs_by_institution')}
      description={localize('com_costs_by_institution_desc')}
    >
      {rows.length === 0 ? (
        <EmptyState message={localize('com_costs_empty')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-220 border-collapse text-left text-[13px] tabular-nums">
            <thead>
              <tr className="text-xs text-(--cui-color-text-muted)">
                <th scope="col" className="py-2 pr-4 font-medium">
                  {localize('com_costs_institution')}
                </th>
                <th scope="col" className="py-2 pr-4 text-right">
                  {head('cost', localize('com_costs_cost_bdt'))}
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  {localize('com_costs_cost_usd')}
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  {localize('com_usage_share')}
                </th>
                <th scope="col" className="py-2 pr-4 text-right">
                  {head('members', localize('com_costs_active_members'))}
                </th>
                <th scope="col" className="py-2 pr-4 text-right">
                  {head('perMember', localize('com_costs_per_member'))}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {localize('com_costs_biggest_service')}
                </th>
                <th scope="col" className="py-2 text-right">
                  {head('change', localize('com_costs_change'))}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const service = biggestService(row.byService);
                return (
                  <tr key={row.tenantId} className="border-t border-(--cui-color-stroke-muted)">
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        onClick={() => onOpen(row)}
                        className="cursor-pointer border-0 bg-transparent p-0 text-left text-[13px] font-semibold text-(--syn-brand-ink) hover:underline"
                      >
                        {row.name}
                      </button>
                      {row.kind === 'unknown' ? (
                        <span className="ml-2 text-xs text-(--syn-warning-fg)">
                          {localize('com_costs_unknown_tenant')}
                        </span>
                      ) : null}
                    </td>
                    <td className="pr-4 text-right font-semibold">{formatBdt(row.cost.costBdt)}</td>
                    <td className="pr-4 text-right">{formatUsd(row.cost.costUsd)}</td>
                    <td className="pr-4 text-right">{formatShare(row.shareOfTotal)}</td>
                    <td className="pr-4 text-right">{formatCompact(row.activeMembers)}</td>
                    <td className="pr-4 text-right">
                      {row.costPerActiveMember == null ? '—' : formatUsd(row.costPerActiveMember)}
                    </td>
                    <td className="pr-4 text-(--cui-color-text-muted)">
                      {service ? localize(serviceLabelKey(service)) : '—'}
                    </td>
                    <td className="text-right">
                      <CostDelta change={row.changeVsPrevious} suffix="" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
