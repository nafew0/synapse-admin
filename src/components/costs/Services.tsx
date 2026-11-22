import type * as t from '@/types';
import {
  formatBdt,
  formatCompact,
  formatShare,
  formatUsd,
  serviceAmount,
  serviceColor,
  serviceLabelKey,
  serviceUnit,
} from '@/utils';
import { Card, DataTable, EmptyState, ShareBar } from '@/components/shared';
import { useLocalize } from '@/hooks';

/** Every service with its units, requests, cost and the institutions that spend most on it. */
export function ServiceTable({ services }: { services: t.CostServiceRow[] }) {
  const localize = useLocalize();
  const total = services.reduce((sum, service) => sum + service.costUsd, 0);
  return (
    <Card
      title={localize('com_costs_by_service')}
      description={localize('com_costs_by_service_desc')}
    >
      {services.length === 0 ? (
        <EmptyState message={localize('com_costs_empty')} />
      ) : (
        <DataTable
          minWidth="min-w-220"
          numericFrom={1}
          head={[
            localize('com_costs_service'),
            localize('com_costs_units'),
            localize('com_usage_requests'),
            localize('com_costs_cost_bdt'),
            localize('com_costs_cost_usd'),
            localize('com_costs_share'),
            localize('com_costs_top_institutions'),
          ]}
        >
          {services.map((service, index) => {
            const unit = serviceUnit(service.service);
            return (
              <tr
                key={service.service}
                className="border-t border-(--cui-color-stroke-muted) align-top"
              >
                <td className="py-3 pr-4 font-semibold">
                  <span
                    aria-hidden="true"
                    className="mr-2 inline-block h-2 w-2 rounded-xs"
                    style={{ background: serviceColor(service.service, index) }}
                  />
                  {localize(serviceLabelKey(service.service))}
                </td>
                <td className="pr-4 text-right">
                  {formatCompact(serviceAmount(service.service, service.units))}{' '}
                  <span className="text-(--cui-color-text-muted)">{localize(unit.labelKey)}</span>
                </td>
                <td className="pr-4 text-right">{formatCompact(service.requests)}</td>
                <td className="pr-4 text-right font-semibold">{formatBdt(service.costBdt)}</td>
                <td className="pr-4 text-right">{formatUsd(service.costUsd)}</td>
                <td className="w-48 pr-4">
                  <div className="flex items-center gap-3">
                    <ShareBar value={service.costUsd} max={total} className="h-2" />
                    <span className="w-10 shrink-0 text-right text-(--cui-color-text-muted)">
                      {total > 0 ? formatShare(service.costUsd / total) : '—'}
                    </span>
                  </div>
                </td>
                <td className="text-right text-(--cui-color-text-muted)">
                  {service.topInstitutions.length === 0
                    ? '—'
                    : service.topInstitutions
                        .slice(0, 3)
                        .map((item) => `${item.name} ${formatUsd(item.costUsd)}`)
                        .join(' · ')}
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}
    </Card>
  );
}
