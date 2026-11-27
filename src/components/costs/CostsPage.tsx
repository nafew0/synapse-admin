import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, CircleDollarSign, Receipt, Users, UserRound } from 'lucide-react';
import type * as t from '@/types';
import { formatBdt, formatDayLabel, formatUsd, serviceColor, serviceLabelKey } from '@/utils';
import {
  AccessDenied,
  Card,
  ChartLegend,
  EmptyState,
  LoadingState,
  StackedBars,
  StatTile,
} from '@/components/shared';
import {
  useCostInstitutions,
  useCostServices,
  useCostSummary,
  useCostTimeseries,
  useLocalize,
} from '@/hooks';
import { KbStorageTable } from '@/components/knowledge';
import { InstitutionTable } from './Institutions';
import { InstitutionCost } from './Institution';
import { CostSettingsCard } from './Settings';
import { useCostRange } from './useCostRange';
import { Reconciliation } from './Reconciliation';
import { CostFilters } from './Filters';
import { ServiceTable } from './Services';
import { CostDelta } from './CostDelta';
import { Money } from './Money';

function FixedCosts({ summary }: { summary: t.CostSummary }) {
  const localize = useLocalize();
  const { fixed, current, grandTotal } = summary;
  return (
    <Card title={localize('com_costs_fixed_title')} description={localize('com_costs_fixed_desc')}>
      <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-[13px] tabular-nums">
        <dt className="text-(--cui-color-text-muted)">{localize('com_costs_variable')}</dt>
        <dd className="m-0 text-right">
          <Money usd={current.cost.costUsd} bdt={current.cost.costBdt} />
        </dd>
        {fixed.items.map((item) => (
          <div key={item.id ?? item.label} className="contents">
            <dt className="text-(--cui-color-text-muted)">
              {item.label}{' '}
              <span className="text-xs">
                ({item.amount} {item.currency} / {localize('com_costs_month')})
              </span>
            </dt>
            <dd className="m-0 text-right">
              <Money usd={item.periodUsd} bdt={item.periodUsd * summary.range.bdtPerUsd} />
            </dd>
          </div>
        ))}
        <dt className="border-t border-(--cui-color-stroke-muted) pt-2 font-semibold">
          {localize('com_costs_grand_total')}
        </dt>
        <dd className="m-0 border-t border-(--cui-color-stroke-muted) pt-2 text-right">
          <Money usd={grandTotal.usd} bdt={grandTotal.bdt} />
        </dd>
      </dl>
    </Card>
  );
}

function DailyCost({ range }: { range: t.DateRange }) {
  const localize = useLocalize();
  const [groupBy, setGroupBy] = useState<t.CostGroupBy>('service');
  const query = useCostTimeseries(range, groupBy);
  const series = useMemo(
    () =>
      (query.data?.series ?? []).map((item, index) => ({
        key: item.key,
        label: groupBy === 'service' ? localize(serviceLabelKey(item.key)) : item.label,
        color:
          groupBy === 'service'
            ? serviceColor(item.key, index)
            : INSTITUTION_COLORS[index % INSTITUTION_COLORS.length],
        values: item.values,
      })),
    [groupBy, localize, query.data?.series],
  );
  const toggle = (
    <div
      role="group"
      aria-label={localize('com_costs_group_by')}
      className="flex overflow-hidden rounded-lg border border-(--cui-color-stroke-default)"
    >
      {(['service', 'institution'] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={groupBy === option}
          onClick={() => setGroupBy(option)}
          className={`h-9 cursor-pointer border-0 px-4 text-[13px] ${
            groupBy === option
              ? 'bg-(--syn-brand-tint) font-semibold text-(--syn-brand-ink)'
              : 'bg-transparent font-medium text-(--cui-color-text-muted) hover:text-(--cui-color-text-default)'
          }`}
        >
          {localize(`com_costs_group_${option}`)}
        </button>
      ))}
    </div>
  );
  return (
    <Card
      title={localize('com_costs_daily')}
      description={localize('com_costs_daily_stacked_desc')}
      action={toggle}
    >
      {query.isLoading ? <LoadingState /> : null}
      {query.data ? (
        <>
          <StackedBars
            days={query.data.days}
            series={series}
            label={localize('com_costs_daily')}
            formatValue={formatUsd}
            formatDay={formatDayLabel}
            height={260}
          />
          <ChartLegend items={series.map((item) => ({ label: item.label, color: item.color }))} />
        </>
      ) : null}
    </Card>
  );
}

const INSTITUTION_COLORS = [
  'var(--syn-chart-1)',
  'var(--syn-chart-2)',
  'var(--syn-info-fg)',
  'var(--syn-warning-fg)',
  'var(--syn-success-fg)',
  'var(--syn-danger-fg)',
  'var(--syn-brand)',
  'var(--syn-ghost)',
];

function Overview({ summary }: { summary: t.CostSummary }) {
  const localize = useLocalize();
  const { current, previous, change } = summary;
  const suffix = localize('com_costs_vs_previous', { count: summary.range.days });
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        index={0}
        icon={<CircleDollarSign size={16} />}
        label={localize('com_costs_total')}
        value={formatBdt(current.cost.costBdt)}
        detail={
          <>
            {formatUsd(current.cost.costUsd)} ·{' '}
            <CostDelta change={change.costUsd} suffix={suffix} />
          </>
        }
      />
      <StatTile
        index={1}
        icon={<Receipt size={16} />}
        label={localize('com_costs_billable')}
        value={formatUsd(current.cost.billableUsd)}
        detail={`${localize('com_costs_platform')}: ${formatUsd(current.cost.platformUsd)}`}
      />
      <StatTile
        index={2}
        icon={<Users size={16} />}
        label={localize('com_costs_active_users')}
        value={String(current.activeUsers)}
        detail={
          <>
            {previous.activeUsers} {localize('com_costs_before')} ·{' '}
            <CostDelta change={change.activeUsers} suffix={suffix} />
          </>
        }
      />
      <StatTile
        index={3}
        icon={<UserRound size={16} />}
        label={localize('com_costs_per_user')}
        value={current.costPerActiveUser == null ? '—' : formatUsd(current.costPerActiveUser)}
        detail={<CostDelta change={change.costPerActiveUser} suffix={suffix} />}
      />
    </div>
  );
}

type CostsView = 'overview' | 'reconcile';

function ViewTabs({ view, onView }: { view: CostsView; onView: (view: CostsView) => void }) {
  const localize = useLocalize();
  return (
    <div
      role="group"
      aria-label={localize('com_costs_title')}
      className="flex w-fit overflow-hidden rounded-lg border border-(--cui-color-stroke-default)"
    >
      {(['overview', 'reconcile'] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={view === option}
          onClick={() => onView(option)}
          className={`h-9 cursor-pointer border-0 px-4 text-[13px] ${
            view === option
              ? 'bg-(--syn-brand-tint) font-semibold text-(--syn-brand-ink)'
              : 'bg-transparent font-medium text-(--cui-color-text-muted) hover:text-(--cui-color-text-default)'
          }`}
        >
          {localize(`com_costs_tab_${option}`)}
        </button>
      ))}
    </div>
  );
}

/** Superadmin view of what every paid service costs, in taka and dollars. */
export function CostsPage() {
  const localize = useLocalize();
  const { preset, setPreset, range } = useCostRange();
  const [selected, setSelected] = useState<t.CostInstitutionRow | null>(null);
  const [view, setView] = useState<CostsView>('overview');
  const summary = useCostSummary(range);
  const institutions = useCostInstitutions(range);
  const services = useCostServices(range);

  if (summary.isError && summary.error?.message?.toLowerCase().includes('forbidden')) {
    return <AccessDenied />;
  }

  const content = () => {
    if (summary.isLoading) return <LoadingState />;
    if (summary.isError || !summary.data) {
      return <EmptyState message={summary.error?.message || localize('com_costs_failed')} />;
    }
    return (
      <>
        <Overview summary={summary.data} />
        <DailyCost range={range} />
        {services.isError ? (
          <EmptyState message={services.error?.message || localize('com_costs_failed')} />
        ) : (
          <ServiceTable services={services.data?.services ?? []} />
        )}
        {institutions.isError ? (
          <EmptyState message={institutions.error?.message || localize('com_costs_failed')} />
        ) : (
          <InstitutionTable
            institutions={institutions.data?.institutions ?? []}
            onOpen={setSelected}
          />
        )}
        <KbStorageTable />
        <FixedCosts summary={summary.data} />
        <CostSettingsCard />
      </>
    );
  };

  if (selected) {
    return (
      <div className="flex flex-1 flex-col overflow-auto">
        <div className="flex w-full flex-col gap-5 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-(--cui-color-stroke-default) bg-transparent px-3 text-[13px] font-semibold"
            >
              <ArrowLeft aria-hidden="true" size={16} />
              {localize('com_costs_back')}
            </button>
            <h2 className="m-0 text-lg font-semibold text-(--cui-color-title-default)">
              {selected.name}
            </h2>
            {selected.kind === 'institution' ? (
              <Link
                to="/institutions/$tenantId"
                params={{ tenantId: selected.tenantId }}
                className="text-[13px] text-(--syn-brand-ink) hover:underline"
              >
                {localize('com_costs_open_institution')}
              </Link>
            ) : null}
          </div>
          <InstitutionCost tenantId={selected.tenantId} control={{ preset, setPreset, range }} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <div className="flex w-full flex-col gap-5 p-6">
        <CostFilters
          preset={preset}
          onPreset={(next) => next !== 'custom' && setPreset(next)}
          range={range}
        />
        <ViewTabs view={view} onView={setView} />
        {view === 'reconcile' ? <Reconciliation range={range} /> : content()}
      </div>
    </div>
  );
}
