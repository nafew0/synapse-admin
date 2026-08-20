import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Icon } from '@clickhouse/click-ui';
import { getRouteApi } from '@tanstack/react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { SystemCapabilities } from '@/constants';
import { useCapabilities } from '@/hooks';
import {
  exportUsageCsvServerFn,
  getUsageMembersFn,
  getUsageModelsFn,
  getUsageSummaryFn,
  getUsageTimeseriesFn,
  listPlatformInstitutionsFn,
} from '@/server';
import {
  AccessDenied,
  EmptyState,
  LoadingState,
  PermissionsUnavailable,
  SearchInput,
} from '@/components/shared';

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function currentMonthStart(): string {
  const now = new Date();
  return isoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
}

function nextMonthStart(): string {
  const now = new Date();
  return isoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(Math.round(value));
}

/** The ledger stores cost in token credits, where 1,000,000 credits = $1 USD
 *  (see the Balance schema). Rendering the raw credit figure as "cost" reads as
 *  dollars and overstates spend a millionfold. */
const CREDITS_PER_USD = 1_000_000;

function formatCost(credits: number): string {
  const usd = credits / CREDITS_PER_USD;
  if (usd === 0) {
    return '$0.00';
  }
  if (Math.abs(usd) < 0.01) {
    return `$${usd.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')}`;
  }
  return `$${usd.toFixed(2)}`;
}

function formatCredits(credits: number): string {
  return `${new Intl.NumberFormat().format(Math.round(credits))} credits`;
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label
      className="admin-themed-control relative flex min-w-40 cursor-pointer flex-col gap-1 rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-muted)"
    >
      <span>{label}</span>
      <span className="text-sm text-(--cui-color-text-default)">{value || 'Select date'}</span>
      <input
        type="date"
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </label>
  );
}

function downloadBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `usage-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

const Route = getRouteApi('/_app');

export function UsagePage() {
  const {
    hasCapability,
    isLoading: capabilitiesLoading,
    isError: capabilitiesError,
  } = useCapabilities();
  const canRead = hasCapability(SystemCapabilities.READ_USAGE);
  const { user } = Route.useRouteContext();

  /** Institution admins are bound to their own tenant; a platform superadmin
   *  has none and picks which institution to look at. */
  const needsInstitutionChoice = !user?.tenantId && user?.isPlatformSuperadmin === true;

  const [start, setStart] = useState(currentMonthStart);
  const [end, setEnd] = useState(nextMonthStart);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState('');

  const institutionsQuery = useQuery({
    queryKey: ['platformInstitutions', 'usage-picker'],
    queryFn: () => listPlatformInstitutionsFn({ data: { limit: 100, offset: 0 } }),
    enabled: needsInstitutionChoice,
  });

  const tenantId = needsInstitutionChoice ? selectedTenantId : undefined;
  const scopeReady = !needsInstitutionChoice || Boolean(selectedTenantId);

  const range = useMemo(() => ({ start, end, tenantId }), [end, start, tenantId]);
  const listInput = useMemo(
    () => ({
      start,
      end,
      tenantId,
      query: search,
      limit: 10,
      offset: 0,
    }),
    [end, search, start, tenantId],
  );

  const summaryQuery = useQuery({
    queryKey: ['usage-summary', range],
    queryFn: () => getUsageSummaryFn({ data: range }),
    enabled: scopeReady,
  });
  const membersQuery = useQuery({
    queryKey: ['usage-members', listInput],
    queryFn: () => getUsageMembersFn({ data: listInput }),
    placeholderData: keepPreviousData,
    enabled: scopeReady,
  });
  const modelsQuery = useQuery({
    queryKey: ['usage-models', listInput],
    queryFn: () => getUsageModelsFn({ data: listInput }),
    placeholderData: keepPreviousData,
    enabled: scopeReady,
  });
  const timeseriesQuery = useQuery({
    queryKey: ['usage-timeseries', range],
    queryFn: () => getUsageTimeseriesFn({ data: range }),
    enabled: scopeReady,
  });

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const response = await exportUsageCsvServerFn({ data: range });
      downloadBlob(await response.blob());
    } finally {
      setExporting(false);
    }
  }, [range]);

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
    <div className="flex items-center gap-2 p-4">
      <label htmlFor="usage-institution" className="text-sm font-medium">
        Institution
      </label>
      <select
        id="usage-institution"
        aria-label="Institution"
        className="admin-themed-control rounded border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-2 py-1 text-sm text-(--cui-color-text-default)"
        value={selectedTenantId}
        onChange={(event) => setSelectedTenantId(event.target.value)}
      >
        <option value="">Select an institution…</option>
        {(institutionsQuery.data?.institutions ?? []).map((institution) => (
          <option key={institution.tenantId} value={institution.tenantId}>
            {institution.name}
          </option>
        ))}
      </select>
    </div>
  ) : null;

  if (needsInstitutionChoice && !selectedTenantId) {
    return (
      <div className="flex flex-1 flex-col">
        {institutionPicker}
        <EmptyState
          message={
            institutionsQuery.isError
              ? 'Failed to load institutions.'
              : 'Select an institution to view its usage.'
          }
        />
      </div>
    );
  }

  if (
    summaryQuery.isLoading ||
    membersQuery.isLoading ||
    modelsQuery.isLoading ||
    timeseriesQuery.isLoading
  ) {
    return <LoadingState />;
  }

  if (summaryQuery.isError) {
    return (
      <EmptyState
        message={summaryQuery.error.message || 'Failed to load institution usage.'}
      />
    );
  }

  if (!summaryQuery.data) {
    return <EmptyState message="No usage data available." />;
  }

  const summary = summaryQuery.data.summary;
  const members = membersQuery.data?.members ?? [];
  const models = modelsQuery.data?.models ?? [];
  const points = timeseriesQuery.data?.points ?? [];
  const maxPointTokens = Math.max(...points.map((point) => point.totalTokens), 1);

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-auto p-6">
      {institutionPicker}
      <section className="flex flex-wrap items-end gap-3">
        <DateField label="Period start" value={start} onChange={setStart} />
        <DateField label="Period end" value={end} onChange={setEnd} />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search members or models"
          className="min-w-70 flex-1"
        />
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 rounded-lg border border-(--cui-color-stroke-default) px-3 py-2 text-sm text-(--cui-color-text-default) transition-colors hover:bg-(--cui-color-background-hover) disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="download" size="xs" />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <SummaryCard
          label="Total tokens"
          value={formatNumber(summary.totalTokens)}
          detail={`${formatNumber(summary.promptTokens)} prompt / ${formatNumber(summary.completionTokens)} completion`}
        />
        <SummaryCard
          label="Usage cost"
          value={formatCost(summary.totalCost)}
          detail={`${formatCredits(summary.totalCost)} · 1,000,000 credits = $1`}
        />
        <SummaryCard
          label="Members with usage"
          value={formatNumber(summary.memberCount)}
          detail={`${formatNumber(summary.eventCount)} transaction rows`}
        />
        <SummaryCard label="Models used" value={formatNumber(summary.modelCount)} />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Panel title="Usage by member">
          {members.length === 0 ? (
            <EmptyState message="No member usage found for this period." />
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-(--cui-color-stroke-default) bg-(--cui-color-background-muted)">
                  <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                    Member
                  </th>
                  <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                    Tokens
                  </th>
                  <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member, index) => (
                  <tr
                    key={member.userId}
                    className={
                      index < members.length - 1
                        ? 'border-b border-(--cui-color-stroke-default)'
                        : undefined
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-(--cui-color-text-default)">
                          {member.name}
                        </span>
                        <span className="text-xs text-(--cui-color-text-muted)">
                          {member.email || 'No email'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-(--cui-color-text-default)">
                      {formatNumber(member.totalTokens)}
                    </td>
                    <td className="px-4 py-3 text-(--cui-color-text-muted)">
                      {formatCost(member.totalCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Daily trend">
          {points.length === 0 ? (
            <EmptyState message="No usage trend data for this period." />
          ) : (
            <div className="flex flex-col gap-3">
              {points.map((point) => (
                <div key={point.day} className="flex items-center gap-3">
                  <div className="w-24 shrink-0 text-xs text-(--cui-color-text-muted)">
                    {point.day}
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-(--cui-color-background-muted)">
                    <div
                      className="h-full rounded-full bg-(--cui-color-background-active)"
                      style={{
                        width: `${Math.max((point.totalTokens / maxPointTokens) * 100, 4)}%`,
                      }}
                    />
                  </div>
                  <div className="w-20 text-right text-xs text-(--cui-color-text-default)">
                    {formatNumber(point.totalTokens)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>

      <Panel title="Usage by model">
        {models.length === 0 ? (
          <EmptyState message="No model usage found for this period." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-(--cui-color-stroke-default) bg-(--cui-color-background-muted)">
                <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">Model</th>
                <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                  Provider
                </th>
                <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                  Tokens
                </th>
                <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                  Members
                </th>
                <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody>
              {models.map((model, index) => (
                <tr
                  key={`${model.providerKey ?? 'unknown'}-${model.modelKey}`}
                  className={
                    index < models.length - 1
                      ? 'border-b border-(--cui-color-stroke-default)'
                      : undefined
                  }
                >
                  <td className="px-4 py-3 font-medium text-(--cui-color-text-default)">
                    {model.modelKey}
                  </td>
                  <td className="px-4 py-3 text-(--cui-color-text-muted)">
                    {model.providerKey || 'unknown'}
                  </td>
                  <td className="px-4 py-3 text-(--cui-color-text-default)">
                    {formatNumber(model.totalTokens)}
                  </td>
                  <td className="px-4 py-3 text-(--cui-color-text-muted)">
                    {formatNumber(model.memberCount)}
                  </td>
                  <td className="px-4 py-3 text-(--cui-color-text-muted)">
                    {formatCost(model.totalCost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-panel)">
      <div className="border-b border-(--cui-color-stroke-default) px-4 py-3">
        <h3 className="text-sm font-medium text-(--cui-color-text-default)">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-panel) p-4">
      <p className="text-xs text-(--cui-color-text-muted)">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-(--cui-color-text-default)">{value}</p>
      {detail ? <p className="mt-1 text-xs text-(--cui-color-text-muted)">{detail}</p> : null}
    </div>
  );
}
