import { useCallback, useMemo, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import type * as t from '@/types';
import {
  useUsageTimeseries,
  useUsageSummary,
  useUsageMembers,
  useUsageModels,
  useCapabilities,
  useAdminScope,
  useLocalize,
} from '@/hooks';
import {
  formatRelativeTime,
  formatUsageNumber,
  formatUsageCost,
  previousRange,
  formatDayLabel,
  datedFilename,
  formatCompact,
  presetRange,
  downloadBlob,
  fillDaily,
  cn,
} from '@/utils';
import {
  PermissionsUnavailable,
  LoadingState,
  AccessDenied,
  ChartLegend,
  RangePicker,
  SearchInput,
  EmptyState,
  Pagination,
  TrendChart,
  ShareBar,
  Delta,
  Card,
} from '@/components/shared';
import { exportUsageCsvServerFn, listPlatformInstitutionsFn } from '@/server';
import { SystemCapabilities } from '@/constants';

const PAGE_SIZE = 10;
const PRESETS: t.RangePreset[] = ['7d', '30d', 'month', 'lastMonth', 'custom'];

type Metric = 'tokens' | 'requests';

const Route = getRouteApi('/_app');

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
        return;
      } catch {
        // Fall back to focus for browsers that reject showPicker in this event.
      }
    }
    input.focus();
  };

  return (
    <label
      onClick={openPicker}
      className="admin-themed-control relative flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-(--cui-color-stroke-default) bg-(--syn-surface) px-3 text-[13px] text-(--cui-color-text-muted)"
    >
      <span>{label}</span>
      <span className="font-semibold text-(--cui-color-text-default)">{value}</span>
      <input
        ref={inputRef}
        type="date"
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        className="pointer-events-none absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
      />
    </label>
  );
}

export function UsagePage() {
  const localize = useLocalize();
  const {
    hasCapability,
    isLoading: capabilitiesLoading,
    isError: capabilitiesError,
  } = useCapabilities();
  const canRead = hasCapability(SystemCapabilities.READ_USAGE);
  const { user } = Route.useRouteContext();
  const { canViewBillingDetail } = useAdminScope();

  /** Institution admins are bound to their own tenant; a platform superadmin
   *  has none and picks which institution to look at. */
  const needsInstitutionChoice = !user?.tenantId && user?.isPlatformSuperadmin === true;

  const [preset, setPreset] = useState<t.RangePreset>('30d');
  const [customRange, setCustomRange] = useState<t.DateRange>(() => presetRange('30d'));
  const [search, setSearch] = useState('');
  const [metric, setMetric] = useState<Metric>('tokens');
  const [exporting, setExporting] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [memberPage, setMemberPage] = useState(1);
  const [modelPage, setModelPage] = useState(1);

  const resetPages = useCallback(() => {
    setMemberPage(1);
    setModelPage(1);
  }, []);

  const institutionsQuery = useQuery({
    queryKey: ['platformInstitutions', 'usage-picker'],
    queryFn: () => listPlatformInstitutionsFn({ data: { limit: 100, offset: 0 } }),
    enabled: needsInstitutionChoice,
  });

  const tenantId = needsInstitutionChoice ? selectedTenantId : undefined;
  const scopeReady = canRead && (!needsInstitutionChoice || Boolean(selectedTenantId));
  const dates = useMemo(
    () => (preset === 'custom' ? customRange : presetRange(preset)),
    [customRange, preset],
  );
  const scope = useMemo(() => ({ ...dates, tenantId }), [dates, tenantId]);
  const previousScope = useMemo(() => ({ ...previousRange(dates), tenantId }), [dates, tenantId]);
  const listScope = (page: number) => ({
    ...scope,
    query: search,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const summaryQuery = useUsageSummary(scope, scopeReady);
  const previousQuery = useUsageSummary(previousScope, scopeReady);
  const timeseriesQuery = useUsageTimeseries(scope, scopeReady);
  const membersQuery = useUsageMembers(listScope(memberPage), scopeReady);
  const modelsQuery = useUsageModels(listScope(modelPage), scopeReady);

  const series = useMemo(() => {
    const points = timeseriesQuery.data?.points ?? [];
    return {
      tokens: fillDaily(points, dates, (point) => point.totalTokens),
      requests: fillDaily(points, dates, (point) => point.eventCount),
    };
  }, [dates, timeseriesQuery.data?.points]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const response = await exportUsageCsvServerFn({ data: scope });
      downloadBlob(await response.blob(), datedFilename('usage', 'csv'));
    } finally {
      setExporting(false);
    }
  }, [scope]);

  if (capabilitiesLoading) {
    return null;
  }
  if (capabilitiesError) {
    return <PermissionsUnavailable />;
  }
  if (!canRead) {
    return <AccessDenied />;
  }

  const institutionPicker = needsInstitutionChoice ? (
    <label className="flex items-center gap-2 text-[13px] font-semibold text-(--cui-color-text-muted)">
      {localize('com_usage_institution')}
      <select
        className="admin-themed-control h-10 rounded-lg border border-(--cui-color-stroke-default) bg-(--syn-surface) px-2 text-sm text-(--cui-color-text-default)"
        value={selectedTenantId}
        onChange={(event) => {
          setSelectedTenantId(event.target.value);
          resetPages();
        }}
      >
        <option value="">{localize('com_usage_select_institution')}</option>
        {(institutionsQuery.data?.institutions ?? []).map((institution) => (
          <option key={institution.tenantId} value={institution.tenantId}>
            {institution.name}
          </option>
        ))}
      </select>
    </label>
  ) : null;

  const filters = (
    <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-(--cui-color-stroke-default) bg-(--syn-surface) p-3">
      {institutionPicker}
      <RangePicker
        value={preset}
        presets={PRESETS}
        onChange={(next) => {
          if (next === 'custom') {
            setCustomRange(dates);
          }
          setPreset(next);
          resetPages();
        }}
      />
      {preset === 'custom' ? (
        <>
          <DateField
            label={localize('com_usage_from')}
            value={customRange.start}
            onChange={(start) => {
              setCustomRange((range) => ({ ...range, start }));
              resetPages();
            }}
          />
          <DateField
            label={localize('com_usage_to')}
            value={customRange.end}
            onChange={(end) => {
              setCustomRange((range) => ({ ...range, end }));
              resetPages();
            }}
          />
        </>
      ) : null}
      <span className="flex-1" />
      <SearchInput
        value={search}
        onChange={(value) => {
          setSearch(value);
          resetPages();
        }}
        placeholder={localize('com_usage_search')}
        ariaLabel={localize('com_usage_search')}
        className="min-w-60 flex-1"
      />
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting || !scopeReady}
        className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-(--cui-color-stroke-default) bg-transparent px-3.5 text-sm font-semibold text-(--cui-color-text-default) transition-colors hover:bg-(--cui-color-background-hover) disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Download aria-hidden="true" size={16} />
        {exporting ? localize('com_usage_exporting') : localize('com_usage_export')}
      </button>
    </div>
  );

  if (needsInstitutionChoice && !selectedTenantId) {
    return (
      <PageFrame>
        {filters}
        <EmptyState
          message={
            institutionsQuery.isError
              ? localize('com_usage_institutions_failed')
              : localize('com_usage_pick_institution')
          }
        />
      </PageFrame>
    );
  }

  if (summaryQuery.isLoading || timeseriesQuery.isLoading) {
    return <LoadingState />;
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <PageFrame>
        {filters}
        <EmptyState message={summaryQuery.error?.message || localize('com_usage_failed')} />
      </PageFrame>
    );
  }

  const summary = summaryQuery.data.summary;
  const before = previousQuery.data?.summary;
  const timezone = summaryQuery.data.range.timezone;
  const comparedTo = localize('com_usage_vs_previous');
  const members = membersQuery.data?.members ?? [];
  const models = modelsQuery.data?.models ?? [];
  const memberPages = Math.max(1, Math.ceil((membersQuery.data?.total ?? 0) / PAGE_SIZE));
  const modelPages = Math.max(1, Math.ceil((modelsQuery.data?.total ?? 0) / PAGE_SIZE));
  const topModel = models[0]?.totalTokens ?? 0;
  const topMember = members[0]?.totalTokens ?? 0;
  const perRequest = (tokens: number, events: number) => (events > 0 ? tokens / events : 0);
  const isTokens = metric === 'tokens';
  const plotted = isTokens ? series.tokens : series.requests;
  const seriesLabel = localize(isTokens ? 'com_usage_tokens_per_day' : 'com_usage_requests_per_day');

  const tiles: Array<{ label: string; value: string; current: number; previous?: number }> = [
    {
      label: localize('com_usage_total_tokens'),
      value: formatCompact(summary.totalTokens),
      current: summary.totalTokens,
      previous: before?.totalTokens,
    },
    {
      label: localize('com_usage_requests'),
      value: formatUsageNumber(summary.eventCount),
      current: summary.eventCount,
      previous: before?.eventCount,
    },
    {
      label: localize('com_usage_tokens_per_request'),
      value: formatUsageNumber(perRequest(summary.totalTokens, summary.eventCount)),
      current: perRequest(summary.totalTokens, summary.eventCount),
      previous: before ? perRequest(before.totalTokens, before.eventCount) : undefined,
    },
    {
      label: localize('com_usage_members_with_usage'),
      value: formatUsageNumber(summary.memberCount),
      current: summary.memberCount,
      previous: before?.memberCount,
    },
    {
      label: localize('com_usage_models_used'),
      value: formatUsageNumber(summary.modelCount),
      current: summary.modelCount,
      previous: before?.modelCount,
    },
  ];
  if (canViewBillingDetail && summary.totalCost != null) {
    tiles.push({
      label: localize('com_usage_cost'),
      value: formatUsageCost(summary.totalCost),
      current: summary.totalCost,
      previous: before?.totalCost,
    });
  }

  return (
    <PageFrame>
      <p className="m-0 text-sm text-(--cui-color-text-muted)">
        {localize('com_dash_range_line', {
          start: formatDayLabel(dates.start),
          end: formatDayLabel(dates.end),
        })}
        {timezone ? ` · ${timezone}` : ''}
      </p>
      {filters}

      <section
        aria-label={localize('com_dash_key_figures')}
        className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] overflow-hidden rounded-xl border border-(--cui-color-stroke-default) bg-(--syn-surface)"
      >
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="-mr-px -mb-px flex flex-col gap-1.5 border-r border-b border-(--cui-color-stroke-muted) px-4 py-4"
          >
            <span className="text-xs font-medium text-(--cui-color-text-muted)">{tile.label}</span>
            <span className="text-2xl font-bold tracking-tight">{tile.value}</span>
            <Delta current={tile.current} previous={tile.previous} suffix={comparedTo} />
          </div>
        ))}
      </section>

      <Card
        title={localize(isTokens ? 'com_usage_token_trend' : 'com_usage_request_trend')}
        description={localize('com_usage_trend_desc')}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <ChartLegend
              items={[
                { label: seriesLabel, color: 'var(--syn-chart-1)' },
                { label: localize('com_chart_7d_average'), color: 'var(--syn-chart-avg)' },
              ]}
            />
            <MetricToggle value={metric} onChange={setMetric} />
          </div>
        }
      >
        {plotted.length === 0 ? (
          <EmptyState message={localize('com_dash_no_usage')} />
        ) : (
          <TrendChart
            data={plotted}
            label={seriesLabel}
            averageLabel={localize('com_chart_7d_average')}
            formatValue={isTokens ? formatCompact : formatUsageNumber}
            formatDay={(day) => formatDayLabel(day, { weekday: 'short', day: 'numeric', month: 'short' })}
            detailRows={(index) =>
              isTokens
                ? [{ label: localize('com_usage_requests'), value: formatUsageNumber(series.requests[index]?.value ?? 0) }]
                : [{ label: localize('com_usage_tokens'), value: formatCompact(series.tokens[index]?.value ?? 0) }]
            }
            height={260}
          />
        )}
      </Card>

      <Card
        title={localize('com_usage_by_model')}
        description={localize('com_usage_models_count', { count: summary.modelCount })}
      >
        {models.length === 0 ? (
          <EmptyState message={localize('com_usage_no_models')} />
        ) : (
          <>
            <DataTable
              minWidth="min-w-180"
              head={[
                localize('com_usage_model'),
                ...(canViewBillingDetail ? [localize('com_usage_provider')] : []),
                localize('com_usage_share'),
                localize('com_usage_tokens'),
                localize('com_usage_requests'),
                localize('com_usage_members'),
                ...(canViewBillingDetail ? [localize('com_usage_cost')] : []),
                localize('com_dash_last_used'),
              ]}
              numericFrom={canViewBillingDetail ? 3 : 2}
            >
              {models.map((model) => (
                <tr key={model.displayName ?? model.modelKey} className="border-t border-(--cui-color-stroke-muted)">
                  <td className="py-3 pr-4 font-semibold">{model.displayName ?? model.modelKey}</td>
                  {canViewBillingDetail ? (
                    <td className="pr-4 text-(--cui-color-text-muted)">{model.providerKey || '—'}</td>
                  ) : null}
                  <td className="w-1/4 pr-6">
                    <div className="flex items-center gap-3">
                      <ShareBar value={model.totalTokens} max={topModel} className="h-2" />
                      <span className="w-10 shrink-0 text-right text-(--cui-color-text-muted)">
                        {summary.totalTokens > 0
                          ? `${Math.round((model.totalTokens / summary.totalTokens) * 100)}%`
                          : '—'}
                      </span>
                    </div>
                  </td>
                  <td className="pr-4 text-right font-semibold">{formatCompact(model.totalTokens)}</td>
                  <td className="pr-4 text-right">{formatUsageNumber(model.eventCount)}</td>
                  <td className="pr-4 text-right">{formatUsageNumber(model.memberCount)}</td>
                  {canViewBillingDetail ? (
                    <td className="pr-4 text-right">{formatUsageCost(model.totalCost ?? 0)}</td>
                  ) : null}
                  <td className="text-right text-(--cui-color-text-muted)">
                    {formatRelativeTime(model.lastUsedAt)}
                  </td>
                </tr>
              ))}
            </DataTable>
            <Pagination currentPage={modelPage} totalPages={modelPages} onPageChange={setModelPage} />
          </>
        )}
      </Card>

      <Card
        title={localize('com_usage_by_member')}
        description={localize('com_usage_by_member_desc')}
      >
        {members.length === 0 ? (
          <EmptyState message={localize('com_usage_no_members')} />
        ) : (
          <>
            <DataTable
              minWidth="min-w-200"
              head={[
                localize('com_dash_member'),
                localize('com_usage_role'),
                localize('com_usage_tokens'),
                localize('com_usage_requests'),
                localize('com_usage_tokens_per_request'),
                ...(canViewBillingDetail ? [localize('com_usage_cost')] : []),
                localize('com_dash_last_used'),
              ]}
              numericFrom={3}
            >
              {members.map((member) => (
                <tr key={member.userId} className="border-t border-(--cui-color-stroke-muted)">
                  <td className="py-2.5 pr-4">
                    <div className="font-semibold">{member.name}</div>
                    <div className="text-xs text-(--cui-color-text-muted)">{member.email}</div>
                  </td>
                  <td className="pr-4">
                    <RoleChip role={member.role} />
                  </td>
                  <td className="w-1/4 pr-6">
                    <div className="flex items-center gap-3">
                      <ShareBar value={member.totalTokens} max={topMember} />
                      <span className="w-14 shrink-0 text-right font-semibold">
                        {formatCompact(member.totalTokens)}
                      </span>
                    </div>
                  </td>
                  <td className="pr-4 text-right">{formatUsageNumber(member.eventCount)}</td>
                  <td className="pr-4 text-right">
                    {formatUsageNumber(perRequest(member.totalTokens, member.eventCount))}
                  </td>
                  {canViewBillingDetail ? (
                    <td className="pr-4 text-right">{formatUsageCost(member.totalCost ?? 0)}</td>
                  ) : null}
                  <td className="text-right text-(--cui-color-text-muted)">
                    {formatRelativeTime(member.lastUsedAt)}
                  </td>
                </tr>
              ))}
            </DataTable>
            <Pagination currentPage={memberPage} totalPages={memberPages} onPageChange={setMemberPage} />
          </>
        )}
      </Card>
    </PageFrame>
  );
}

function PageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-6">{children}</div>
    </div>
  );
}

function MetricToggle({ value, onChange }: { value: Metric; onChange: (metric: Metric) => void }) {
  const localize = useLocalize();
  const options: Array<{ key: Metric; label: string }> = [
    { key: 'tokens', label: localize('com_usage_tokens') },
    { key: 'requests', label: localize('com_usage_requests') },
  ];
  return (
    <div role="group" aria-label={localize('com_usage_metric')} className="flex rounded-lg bg-(--cui-color-background-muted) p-0.5">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          aria-pressed={option.key === value}
          onClick={() => onChange(option.key)}
          className={cn(
            'h-8 cursor-pointer rounded-md border-0 px-3 text-[13px]',
            option.key === value
              ? 'bg-(--syn-surface) font-semibold text-(--syn-brand-ink) shadow-sm'
              : 'bg-transparent font-medium text-(--cui-color-text-muted)',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function DataTable({
  head,
  numericFrom,
  minWidth,
  children,
}: {
  head: string[];
  /** Columns at or after this index are right-aligned numbers. */
  numericFrom: number;
  minWidth: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full border-collapse text-left text-[13px] tabular-nums', minWidth)}>
        <thead>
          <tr className="text-xs text-(--cui-color-text-muted)">
            {head.map((label, index) => (
              <th
                key={label}
                scope="col"
                className={cn('py-2 pr-4 font-medium last:pr-0', index >= numericFrom && 'text-right')}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function RoleChip({ role }: { role?: string }) {
  const localize = useLocalize();
  const isAdmin = role === 'INSTITUTION_ADMIN' || role === 'ADMIN';
  return (
    <span
      className={cn(
        'rounded-md px-2 py-0.5 text-xs font-semibold',
        isAdmin
          ? 'bg-(--syn-brand-tint) text-(--syn-brand-ink)'
          : 'bg-(--syn-neutral-bg) text-(--syn-neutral-fg)',
      )}
    >
      {localize(isAdmin ? 'com_role_admin' : 'com_role_member')}
    </span>
  );
}
