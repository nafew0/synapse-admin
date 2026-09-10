import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@clickhouse/click-ui';
import { getRouteApi } from '@tanstack/react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { SystemCapabilities } from '@/constants';
import { useAdminScope, useCapabilities } from '@/hooks';
import {
  datedFilename,
  downloadBlob,
  formatUsageCost,
  formatUsageCredits,
  formatUsageNumber,
} from '@/utils';
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
  Pagination,
  PermissionsUnavailable,
  SearchInput,
} from '@/components/shared';

const PAGE_SIZE = 10;

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
      className="admin-themed-control relative flex min-w-40 cursor-pointer flex-col gap-1 rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-muted)"
    >
      <span>{label}</span>
      <span className="text-sm text-(--cui-color-text-default)">{value || 'Select date'}</span>
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

const Route = getRouteApi('/_app');

export function UsagePage() {
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

  const [start, setStart] = useState(currentMonthStart);
  const [end, setEnd] = useState(nextMonthStart);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [memberPage, setMemberPage] = useState(1);
  const [modelPage, setModelPage] = useState(1);

  /** Any filter change invalidates both page positions: page 3 of the old
   *  result set is meaningless, and may not exist, in the new one. */
  const withPageReset = useCallback(
    (setter: (value: string) => void) => (value: string) => {
      setter(value);
      setMemberPage(1);
      setModelPage(1);
    },
    [],
  );

  const institutionsQuery = useQuery({
    queryKey: ['platformInstitutions', 'usage-picker'],
    queryFn: () => listPlatformInstitutionsFn({ data: { limit: 100, offset: 0 } }),
    enabled: needsInstitutionChoice,
  });

  const tenantId = needsInstitutionChoice ? selectedTenantId : undefined;
  const scopeReady = !needsInstitutionChoice || Boolean(selectedTenantId);

  const range = useMemo(() => ({ start, end, tenantId }), [end, start, tenantId]);
  const membersInput = useMemo(
    () => ({
      start,
      end,
      tenantId,
      query: search,
      limit: PAGE_SIZE,
      offset: (memberPage - 1) * PAGE_SIZE,
    }),
    [end, memberPage, search, start, tenantId],
  );
  const modelsInput = useMemo(
    () => ({
      start,
      end,
      tenantId,
      query: search,
      limit: PAGE_SIZE,
      offset: (modelPage - 1) * PAGE_SIZE,
    }),
    [end, modelPage, search, start, tenantId],
  );

  const summaryQuery = useQuery({
    queryKey: ['usage-summary', range],
    queryFn: () => getUsageSummaryFn({ data: range }),
    enabled: scopeReady,
  });
  const membersQuery = useQuery({
    queryKey: ['usage-members', membersInput],
    queryFn: () => getUsageMembersFn({ data: membersInput }),
    placeholderData: keepPreviousData,
    enabled: scopeReady,
  });
  const modelsQuery = useQuery({
    queryKey: ['usage-models', modelsInput],
    queryFn: () => getUsageModelsFn({ data: modelsInput }),
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
      downloadBlob(await response.blob(), datedFilename('usage', 'csv'));
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
        onChange={(event) => withPageReset(setSelectedTenantId)(event.target.value)}
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
      <EmptyState message={summaryQuery.error.message || 'Failed to load institution usage.'} />
    );
  }

  if (!summaryQuery.data) {
    return <EmptyState message="No usage data available." />;
  }

  const summary = summaryQuery.data.summary;
  const members = membersQuery.data?.members ?? [];
  const models = modelsQuery.data?.models ?? [];
  const points = timeseriesQuery.data?.points ?? [];
  const memberPages = Math.max(1, Math.ceil((membersQuery.data?.total ?? 0) / PAGE_SIZE));
  const modelPages = Math.max(1, Math.ceil((modelsQuery.data?.total ?? 0) / PAGE_SIZE));
  const maxPointTokens = Math.max(...points.map((point) => point.totalTokens), 1);

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-auto p-6">
      {institutionPicker}
      <section className="flex flex-wrap items-end gap-3">
        <DateField label="Period start" value={start} onChange={withPageReset(setStart)} />
        <DateField label="Period end" value={end} onChange={withPageReset(setEnd)} />
        <SearchInput
          value={search}
          onChange={withPageReset(setSearch)}
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

      <section
        className={`grid grid-cols-1 gap-3 ${canViewBillingDetail ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}
      >
        <SummaryCard
          label="Total tokens"
          value={formatUsageNumber(summary.totalTokens)}
          detail={`${formatUsageNumber(summary.promptTokens)} prompt / ${formatUsageNumber(summary.completionTokens)} completion`}
        />
        {canViewBillingDetail && summary.totalCost != null ? (
          <SummaryCard
            label="Usage cost"
            value={formatUsageCost(summary.totalCost)}
            detail={`${formatUsageCredits(summary.totalCost)} · 1,000,000 credits = $1`}
          />
        ) : null}
        <SummaryCard
          label="Members with usage"
          value={formatUsageNumber(summary.memberCount)}
          detail={`${formatUsageNumber(summary.eventCount)} transaction rows`}
        />
        <SummaryCard label="Models used" value={formatUsageNumber(summary.modelCount)} />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Panel title="Usage by member">
          {members.length === 0 ? (
            <EmptyState message="No member usage found for this period." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-(--cui-color-stroke-default) bg-(--cui-color-background-muted)">
                      <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                        Member
                      </th>
                      <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                        Tokens
                      </th>
                      {canViewBillingDetail ? (
                        <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                          Cost
                        </th>
                      ) : null}
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
                          {formatUsageNumber(member.totalTokens)}
                        </td>
                        {canViewBillingDetail ? (
                          <td className="px-4 py-3 text-(--cui-color-text-muted)">
                            {formatUsageCost(member.totalCost ?? 0)}
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={memberPage}
                totalPages={memberPages}
                onPageChange={setMemberPage}
              />
            </>
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
                    {formatUsageNumber(point.totalTokens)}
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
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-(--cui-color-stroke-default) bg-(--cui-color-background-muted)">
                    <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">Model</th>
                    {canViewBillingDetail ? (
                      <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                        Provider
                      </th>
                    ) : null}
                    <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                      Tokens
                    </th>
                    <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                      Members
                    </th>
                    {canViewBillingDetail ? (
                      <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                        Cost
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {models.map((model, index) => (
                    <tr
                      key={model.displayName ?? model.modelKey}
                      className={
                        index < models.length - 1
                          ? 'border-b border-(--cui-color-stroke-default)'
                          : undefined
                      }
                    >
                      <td className="px-4 py-3 font-medium text-(--cui-color-text-default)">
                        {model.displayName ?? model.modelKey}
                      </td>
                      {canViewBillingDetail ? (
                        <td className="px-4 py-3 text-(--cui-color-text-muted)">
                          {model.providerKey || 'unknown'}
                        </td>
                      ) : null}
                      <td className="px-4 py-3 text-(--cui-color-text-default)">
                        {formatUsageNumber(model.totalTokens)}
                      </td>
                      <td className="px-4 py-3 text-(--cui-color-text-muted)">
                        {formatUsageNumber(model.memberCount)}
                      </td>
                      {canViewBillingDetail ? (
                        <td className="px-4 py-3 text-(--cui-color-text-muted)">
                          {formatUsageCost(model.totalCost ?? 0)}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={modelPage}
              totalPages={modelPages}
              onPageChange={setModelPage}
            />
          </>
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

function SummaryCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-panel) p-4">
      <p className="text-xs text-(--cui-color-text-muted)">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-(--cui-color-text-default)">{value}</p>
      {detail ? <p className="mt-1 text-xs text-(--cui-color-text-muted)">{detail}</p> : null}
    </div>
  );
}
