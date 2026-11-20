import { useMemo } from 'react';
import { CircleDollarSign, Receipt, Users, Wrench } from 'lucide-react';
import type * as t from '@/types';
import {
  fillDaily,
  formatBdt,
  formatCompact,
  formatDayLabel,
  formatUsd,
  serviceColor,
  serviceLabelKey,
  sortedServices,
  topRequests,
} from '@/utils';
import {
  Card,
  DataTable,
  EmptyState,
  LoadingState,
  StatTile,
  TrendChart,
  ShareBar,
} from '@/components/shared';
import { useCostInstitution, useCostRequests, useLocalize } from '@/hooks';
import { CostFilters } from './Filters';
import { useCostRange } from './useCostRange';

const MEMBER_ROWS = 20;

function ModelTable({ rows }: { rows: t.CostInstitutionDetail['byModel'] }) {
  const localize = useLocalize();
  return (
    <Card title={localize('com_costs_by_model')} description={localize('com_costs_by_model_desc')}>
      {rows.length === 0 ? (
        <EmptyState message={localize('com_costs_empty')} />
      ) : (
        <DataTable
          minWidth="min-w-160"
          numericFrom={2}
          head={[
            localize('com_usage_model'),
            localize('com_costs_service'),
            localize('com_usage_requests'),
            localize('com_costs_cost_bdt'),
            localize('com_costs_cost_usd'),
          ]}
        >
          {rows.slice(0, 15).map((row) => (
            <tr
              key={`${row.service}|${row.model ?? ''}`}
              className="border-t border-(--cui-color-stroke-muted)"
            >
              <td className="py-3 pr-4 font-semibold">{row.model ?? '—'}</td>
              <td className="pr-4 text-(--cui-color-text-muted)">
                {localize(serviceLabelKey(row.service))}
              </td>
              <td className="pr-4 text-right">{formatCompact(row.requests)}</td>
              <td className="pr-4 text-right font-semibold">{formatBdt(row.costBdt)}</td>
              <td className="text-right">{formatUsd(row.costUsd)}</td>
            </tr>
          ))}
        </DataTable>
      )}
    </Card>
  );
}

function MemberTable({ rows }: { rows: t.CostMemberRow[] }) {
  const localize = useLocalize();
  return (
    <Card
      title={localize('com_costs_by_member')}
      description={localize('com_costs_by_member_desc')}
    >
      {rows.length === 0 ? (
        <EmptyState message={localize('com_costs_empty')} />
      ) : (
        <DataTable
          minWidth="min-w-180"
          numericFrom={1}
          head={[
            localize('com_costs_member'),
            localize('com_usage_requests'),
            localize('com_costs_cost_bdt'),
            localize('com_costs_cost_usd'),
            localize('com_costs_by_service'),
          ]}
        >
          {rows.slice(0, MEMBER_ROWS).map((row) => (
            <tr
              key={`${row.user ?? 'none'}|${row.tenantId}`}
              className="border-t border-(--cui-color-stroke-muted)"
            >
              <td className="py-3 pr-4">
                <div className="font-semibold">{row.name ?? row.email ?? row.user ?? '—'}</div>
                {row.name && row.email ? (
                  <div className="text-xs text-(--cui-color-text-muted)">{row.email}</div>
                ) : null}
              </td>
              <td className="pr-4 text-right">{formatCompact(row.requests)}</td>
              <td className="pr-4 text-right font-semibold">{formatBdt(row.costBdt)}</td>
              <td className="pr-4 text-right">{formatUsd(row.costUsd)}</td>
              <td className="text-right text-(--cui-color-text-muted)">
                {sortedServices(row.byService)
                  .slice(0, 3)
                  .map(
                    (service) =>
                      `${localize(serviceLabelKey(service))} ${formatUsd(row.byService[service])}`,
                  )
                  .join(' · ')}
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </Card>
  );
}

function RequestTable({ rows }: { rows: t.CostRequestRow[] }) {
  const localize = useLocalize();
  const top = topRequests(rows, 10);
  return (
    <Card
      title={localize('com_costs_top_requests')}
      description={localize('com_costs_top_requests_desc', { count: rows.length })}
    >
      {top.length === 0 ? (
        <EmptyState message={localize('com_costs_empty')} />
      ) : (
        <DataTable
          minWidth="min-w-200"
          numericFrom={5}
          head={[
            localize('com_costs_when'),
            localize('com_costs_service'),
            localize('com_usage_model'),
            localize('com_costs_task'),
            localize('com_costs_conversation'),
            localize('com_costs_ledger_usd'),
          ]}
        >
          {top.map((row) => (
            <tr key={row.id} className="border-t border-(--cui-color-stroke-muted)">
              <td className="py-3 pr-4 whitespace-nowrap">
                {new Date(row.createdAt).toLocaleString()}
              </td>
              <td className="pr-4">{row.service ? localize(serviceLabelKey(row.service)) : '—'}</td>
              <td className="pr-4 text-(--cui-color-text-muted)">{row.model ?? '—'}</td>
              <td className="pr-4 text-(--cui-color-text-muted)">{row.taskType ?? '—'}</td>
              <td className="pr-4 font-mono text-xs text-(--cui-color-text-muted)">
                {row.conversationId ?? '—'}
              </td>
              <td className="text-right font-semibold">{formatUsd(row.ledgerUsd)}</td>
            </tr>
          ))}
        </DataTable>
      )}
    </Card>
  );
}

function ServiceShares({ detail }: { detail: t.CostInstitutionDetail }) {
  const localize = useLocalize();
  const services = sortedServices(detail.byService);
  const max = Math.max(...Object.values(detail.byService), 0);
  return (
    <Card
      title={localize('com_costs_by_service')}
      description={localize('com_costs_by_service_desc')}
    >
      {services.length === 0 ? (
        <EmptyState message={localize('com_costs_empty')} />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {services.map((service, index) => (
            <li key={service} className="flex items-center gap-3 text-[13px]">
              <span className="w-36 shrink-0 font-semibold">
                <span
                  aria-hidden="true"
                  className="mr-2 inline-block h-2 w-2 rounded-xs"
                  style={{ background: serviceColor(service, index) }}
                />
                {localize(serviceLabelKey(service))}
              </span>
              <ShareBar value={detail.byService[service]} max={max} className="h-2" />
              <span className="w-24 shrink-0 text-right tabular-nums">
                {formatUsd(detail.byService[service])}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** One institution's cost by service, model, member and day, plus its costliest ledger rows. */
export function InstitutionCost({ tenantId }: { tenantId: string }) {
  const localize = useLocalize();
  const { preset, setPreset, range } = useCostRange();
  const detail = useCostInstitution(tenantId, range);
  const requests = useCostRequests(tenantId, range);

  const series = useMemo(
    () => fillDaily(detail.data?.byDay ?? [], range, (point) => point.costUsd),
    [detail.data?.byDay, range],
  );

  const body = () => {
    if (detail.isLoading) return <LoadingState />;
    if (detail.isError || !detail.data) {
      return <EmptyState message={detail.error?.message || localize('com_costs_failed')} />;
    }
    const data = detail.data;
    return (
      <>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            index={0}
            icon={<CircleDollarSign size={16} />}
            label={localize('com_costs_total')}
            value={formatBdt(data.cost.costBdt)}
            detail={formatUsd(data.cost.costUsd)}
          />
          <StatTile
            index={1}
            icon={<Receipt size={16} />}
            label={localize('com_costs_billable')}
            value={formatUsd(data.cost.billableUsd)}
            detail={`${localize('com_costs_platform')}: ${formatUsd(data.cost.platformUsd)}`}
          />
          <StatTile
            index={2}
            icon={<Users size={16} />}
            label={localize('com_costs_active_members')}
            value={String(data.activeMembers)}
            detail={
              data.activeMembers
                ? `${formatUsd(data.cost.costUsd / data.activeMembers)} ${localize('com_costs_per_member_short')}`
                : undefined
            }
          />
          <StatTile
            index={3}
            icon={<Wrench size={16} />}
            label={localize('com_usage_requests')}
            value={formatCompact(data.cost.requests)}
            detail={`${localize('com_costs_fee_included')}: ${formatUsd(data.cost.feeUsd)}`}
          />
        </div>
        <Card title={localize('com_costs_daily')} description={localize('com_costs_daily_desc')}>
          <TrendChart
            data={series}
            label={localize('com_costs_total')}
            averageLabel={localize('com_costs_avg7')}
            formatValue={formatUsd}
            formatDay={formatDayLabel}
            variant="bars"
            height={220}
          />
        </Card>
        <ServiceShares detail={data} />
        <ModelTable rows={data.byModel} />
        <MemberTable rows={data.byMember} />
        <RequestTable rows={requests.data?.requests ?? []} />
      </>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <CostFilters
        preset={preset}
        onPreset={(next) => next !== 'custom' && setPreset(next)}
        range={range}
      />
      {body()}
    </div>
  );
}
