import { useEffect, useMemo, useState } from 'react';
import { Button } from '@clickhouse/click-ui';
import { Link, getRouteApi } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPlatformInstitutionPolicyFn,
  getMembersFn,
  getPlatformInstitutionFn,
  getPlatformInstitutionQuotaFn,
  getPlatformInstitutionQuotaReadinessFn,
  listPlatformInstitutionPoliciesFn,
  previewPlatformInstitutionPolicyFn,
  revokePlatformInstitutionAdminFn,
} from '@/server';
import type * as t from '@/types';
import { EmptyState, LoadingState } from '@/components/shared';
import { notifyError, notifySuccess } from '@/utils';

const Route = getRouteApi('/_app/institutions/$tenantId');
const AppRoute = getRouteApi('/_app');
type Tab = 'overview' | 'members' | 'usage' | 'policy' | 'history';

function formatTokens(value: number | null | undefined) {
  return value == null ? 'Unlimited' : new Intl.NumberFormat().format(value);
}

/** Blank means unlimited. Anything non-numeric is a mistake, not unlimited:
 *  JSON.stringify turns NaN into null, which the API accepts as "no limit". */
function parseLimit(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`"${trimmed}" is not a whole number. Leave blank for unlimited.`);
  }
  return parsed;
}

export function InstitutionDetailPage() {
  const { tenantId } = Route.useParams();
  const { user } = AppRoute.useRouteContext();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [memberQuery, setMemberQuery] = useState('');
  const [memberOffset, setMemberOffset] = useState(0);
  const memberLimit = 25;
  const institutionQuery = useQuery({
    queryKey: ['platformInstitution', tenantId],
    queryFn: () => getPlatformInstitutionFn({ data: { tenantId } }),
  });
  const quotaQuery = useQuery({
    queryKey: ['platformInstitutionQuota', tenantId],
    queryFn: () => getPlatformInstitutionQuotaFn({ data: { tenantId } }),
  });
  const membersQuery = useQuery({
    queryKey: ['platformInstitutionMembers', tenantId, memberQuery, memberOffset],
    queryFn: () =>
      getMembersFn({
        data: {
          platform: true,
          tenantId,
          limit: memberLimit,
          offset: memberOffset,
          query: memberQuery,
          status: 'all',
          role: 'all',
        },
      }),
    enabled: tab === 'members',
  });
  const adminsQuery = useQuery({
    queryKey: ['platformInstitutionAdmins', tenantId],
    queryFn: () =>
      getMembersFn({
        data: {
          platform: true,
          tenantId,
          limit: 100,
          offset: 0,
          status: 'active',
          role: 'INSTITUTION_ADMIN',
        },
      }),
    enabled: tab === 'overview',
  });
  const readinessQuery = useQuery({
    queryKey: ['platformInstitutionQuotaReadiness', tenantId],
    queryFn: () => getPlatformInstitutionQuotaReadinessFn({ data: { tenantId } }),
    enabled: tab === 'usage',
  });
  const historyQuery = useQuery({
    queryKey: ['platformInstitutionPolicies', tenantId],
    queryFn: () => listPlatformInstitutionPoliciesFn({ data: { tenantId } }),
    enabled: tab === 'history',
  });
  const revokeAdminMutation = useMutation({
    mutationFn: (admin: t.InstitutionMember) =>
      revokePlatformInstitutionAdminFn({ data: { tenantId, userId: admin.id } }),
    onSuccess: () => {
      notifySuccess('Institution administrator revoked');
      queryClient.invalidateQueries({ queryKey: ['platformInstitutionAdmins', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['platformInstitutionMembers', tenantId] });
    },
    onError: (error: Error) => notifyError(error.message),
  });

  if (!user?.isPlatformSuperadmin) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState message="Platform superadmin access is required for institution management." />
      </div>
    );
  }

  if (institutionQuery.isLoading || quotaQuery.isLoading) return <LoadingState />;
  if (institutionQuery.isError || quotaQuery.isError) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          message={
            institutionQuery.error?.message ||
            quotaQuery.error?.message ||
            'Failed to load institution'
          }
        />
      </div>
    );
  }

  if (!institutionQuery.data || !quotaQuery.data) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState message="Failed to load institution" />
      </div>
    );
  }

  const institution = institutionQuery.data.institution;
  const quota = quotaQuery.data;
  const admins = adminsQuery.data?.members ?? [];

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-auto p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/institutions" className="text-xs text-(--cui-color-text-muted)">
            ← Institutions
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-(--cui-color-text-default)">
            {institution.name}
          </h1>
          <p className="text-sm text-(--cui-color-text-muted)">{institution.tenantId}</p>
        </div>
        <span
          className={
            institution.status === 'suspended'
              ? 'rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-400'
              : 'rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-400'
          }
        >
          {institution.status}
        </span>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-(--cui-color-stroke-default) pb-3">
        {(['overview', 'members', 'usage', 'policy', 'history'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={
              tab === item
                ? 'rounded-lg bg-(--cui-color-background-accent) px-3 py-2 text-sm text-(--cui-color-text-default)'
                : 'rounded-lg px-3 py-2 text-sm text-(--cui-color-text-muted) hover:bg-(--cui-color-background-hover)'
            }
          >
            {item === 'usage' ? 'Usage & limits' : item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <Overview
          institution={institution}
          policy={quota.policy}
          admins={admins}
          adminsError={adminsQuery.isError}
          revoking={revokeAdminMutation.isPending}
          onRevokeAdmin={(admin) => revokeAdminMutation.mutate(admin)}
        />
      )}
      {tab === 'members' && membersQuery.isError && (
        <EmptyState message={membersQuery.error?.message || 'Failed to load members.'} />
      )}
      {tab === 'members' && !membersQuery.isError && (
        <Members
          members={membersQuery.data?.members ?? []}
          total={membersQuery.data?.total ?? 0}
          query={memberQuery}
          offset={memberOffset}
          limit={memberLimit}
          loading={membersQuery.isFetching}
          onQueryChange={(value) => {
            setMemberQuery(value);
            setMemberOffset(0);
          }}
          onOffsetChange={setMemberOffset}
        />
      )}
      {tab === 'usage' && (
        <Usage
          policy={quota.policy}
          health={quota.health}
          readiness={readinessQuery.data}
          readinessError={readinessQuery.isError}
        />
      )}
      {tab === 'policy' && (
        <PolicyEditor
          /** Remount when the loaded version changes so the form values and the
           *  expectedVersion sent with them always describe the same policy —
           *  otherwise a background refetch silently arms an overwrite. */
          key={`${tenantId}:${quota.policy.version}`}
          tenantId={tenantId}
          policy={quota.policy}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['platformInstitutionQuota', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['platformInstitutionPolicies', tenantId] });
          }}
        />
      )}
      {tab === 'history' &&
        (historyQuery.isError ? (
          <EmptyState message={historyQuery.error?.message || 'Failed to load policy history.'} />
        ) : (
          <History policies={historyQuery.data?.policies ?? []} />
        ))}
    </div>
  );
}

function Overview({
  institution,
  policy,
  admins,
  adminsError,
  revoking,
  onRevokeAdmin,
}: {
  institution: t.PlatformInstitution;
  policy: t.UsagePolicy;
  admins: t.InstitutionMember[];
  adminsError: boolean;
  revoking: boolean;
  onRevokeAdmin: (admin: t.InstitutionMember) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Panel title="Institution">
        <Detail label="Timezone" value={institution.timezone ?? policy.timezone} />
        <Detail label="Slug" value={institution.slug ?? 'Not configured'} />
        <Detail
          label="Seats"
          value={`${institution.stats?.activeMembers ?? 0} / ${formatTokens(
            institution.limits?.maxActiveMembers,
          )}`}
        />
      </Panel>
      <Panel title="Administrators">
        {adminsError && (
          <p className="text-sm text-(--cui-color-text-muted)">
            Could not load administrators — retry before acting on this.
          </p>
        )}
        {!adminsError && admins.length === 0 && (
          <p className="text-sm text-amber-400">No active institution administrator.</p>
        )}
        {!adminsError &&
          admins.map((admin) => (
            <div key={admin.id} className="flex items-center justify-between gap-2">
              <Detail label={admin.name || admin.email} value={admin.email} />
              <Button
                type="secondary"
                label="Revoke"
                disabled={revoking}
                onClick={() => onRevokeAdmin(admin)}
              />
            </div>
          ))}
      </Panel>
    </div>
  );
}

function Members({
  members,
  total,
  query,
  offset,
  limit,
  loading,
  onQueryChange,
  onOffsetChange,
}: {
  members: t.InstitutionMember[];
  total: number;
  query: string;
  offset: number;
  limit: number;
  loading: boolean;
  onQueryChange: (value: string) => void;
  onOffsetChange: (value: number) => void;
}) {
  return (
    <Panel title={`Members (${total})`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search name or email"
          className="min-w-64 rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"
        />
        {loading && <span className="text-xs text-(--cui-color-text-muted)">Loading…</span>}
      </div>
      <div className="divide-y divide-(--cui-color-stroke-default)">
        {members.map((member) => (
          <div key={`${member.kind}:${member.id}`} className="flex justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium text-(--cui-color-text-default)">{member.name}</p>
              <p className="text-xs text-(--cui-color-text-muted)">{member.email}</p>
            </div>
            <div className="text-right text-xs text-(--cui-color-text-muted)">
              <p>{member.role === 'INSTITUTION_ADMIN' ? 'Institution admin' : 'Member'}</p>
              <p>{member.status}</p>
            </div>
          </div>
        ))}
        {members.length === 0 && <EmptyState message="No members found." />}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Button disabled={offset === 0 || loading} onClick={() => onOffsetChange(Math.max(offset - limit, 0))} label="Previous" />
        <span className="text-xs text-(--cui-color-text-muted)">
          {total === 0 ? 0 : offset + 1}–{Math.min(offset + limit, total)} of {total}
        </span>
        <Button disabled={offset + limit >= total || loading} onClick={() => onOffsetChange(offset + limit)} label="Next" />
      </div>
    </Panel>
  );
}

function Usage({
  policy,
  health,
  readiness,
  readinessError,
}: {
  policy: t.UsagePolicy;
  health: {
    range: { start: string; end: string; timezone: string };
    buckets: t.UsageBucketHealth[];
    warnings: t.UsageWarning[];
  };
  readiness?: t.QuotaReadinessReport;
  readinessError?: boolean;
}) {
  const institutionBucket = health.buckets.find((bucket) => bucket.scopeType === 'institution');
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Metric label="Used tokens" value={formatTokens(institutionBucket?.usedTokens ?? 0)} />
      <Metric
        label="Reserved tokens"
        value={formatTokens(institutionBucket?.reservedTokens ?? 0)}
      />
      <Metric
        label="Remaining"
        value={formatTokens(
          institutionBucket?.remaining ?? policy.limits.institutionTokens ?? null,
        )}
      />
      <Panel title="Model breakdown" className="md:col-span-3">
        {health.buckets
          .filter((bucket) => bucket.scopeType === 'model')
          .map((bucket) => (
            <Detail
              key={bucket.scopeKey}
              label={bucket.scopeKey}
              value={`${formatTokens(bucket.usedTokens)} used · ${formatTokens(
                bucket.reservedTokens,
              )} reserved · ${formatTokens(bucket.remaining)} remaining`}
            />
          ))}
        <p className="mt-3 text-xs text-(--cui-color-text-muted)">
          Resets {new Date(health.range.end).toLocaleString()} ({health.range.timezone})
        </p>
      </Panel>
      {readinessError && (
        <div className="md:col-span-3">
          <Panel title="Shadow rollout gate">
            <p className="text-sm text-(--cui-color-text-muted)">
              Could not load the readiness report. This panel is not a pass or a fail — retry.
            </p>
          </Panel>
        </div>
      )}
      {readiness && (
        <Panel title="Shadow rollout gate" className="md:col-span-3">
          <p className={readiness.ready ? 'text-sm text-emerald-400' : 'text-sm text-amber-400'}>
            {readiness.ready ? 'Ready for manual enforcement review' : 'Not ready for enforcement'}
          </p>
          <div className="mt-2 grid gap-x-6 md:grid-cols-3">
            <Detail label="Observed days" value={readiness.metrics.observedDays.toFixed(1)} />
            <Detail
              label="Attributable calls"
              value={formatTokens(readiness.metrics.attributableCalls)}
            />
            <Detail
              label="Unattributed events"
              value={String(readiness.metrics.unattributedEvents)}
            />
            <Detail label="Duplicate groups" value={String(readiness.metrics.duplicateGroups)} />
            <Detail
              label="Stale reservations"
              value={`${(readiness.metrics.staleRate * 100).toFixed(3)}%`}
            />
            <Detail
              label="Estimation overage"
              value={`${(readiness.metrics.estimationOverageRate * 100).toFixed(3)}%`}
            />
            <Detail
              label="Reservation coverage"
              value={`${(readiness.metrics.reservationCoverageRate * 100).toFixed(2)}%`}
            />
            <Detail
              label="Uncovered model calls"
              value={String(readiness.metrics.uncoveredLedgerCalls)}
            />
          </div>
        </Panel>
      )}
      {health.warnings.length > 0 && (
        <Panel title="Usage warnings" className="md:col-span-3">
          {health.warnings.map((warning) => (
            <p key={warning._id} className="py-1 text-sm text-amber-400">
              {warning.scopeType} {warning.scopeKey} reached {Math.round(warning.threshold * 100)}%
            </p>
          ))}
        </Panel>
      )}
    </div>
  );
}

function PolicyEditor({
  tenantId,
  policy,
  onSaved,
}: {
  tenantId: string;
  policy: t.UsagePolicy;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState(policy.mode);
  const [timezone, setTimezone] = useState(policy.timezone);
  const [institutionLimit, setInstitutionLimit] = useState(
    policy.limits.institutionTokens?.toString() ?? '',
  );
  const [memberLimit, setMemberLimit] = useState(policy.limits.memberTokens?.toString() ?? '');
  const [modelLimits, setModelLimits] = useState(
    policy.limits.modelTokens
      .map((entry) => `${entry.modelKey}=${entry.maxTokens ?? ''}`)
      .join('\n'),
  );
  const [reason, setReason] = useState('');
  const [acknowledge, setAcknowledge] = useState(false);
  const [preview, setPreview] = useState<t.UsagePolicyPreview | null>(null);

  /** A malformed limit is a user error, not a crash: keep it out of render and
   *  report it when they try to preview or save. */
  const parsed = useMemo<{ input?: t.UsagePolicyInput; error?: string }>(() => {
    try {
      return {
        input: {
          mode,
          timezone,
          limits: {
            institutionTokens: parseLimit(institutionLimit),
            memberTokens: parseLimit(memberLimit),
            modelTokens: modelLimits
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [modelKey, rawLimit = ''] = line.split('=');
                return { modelKey: modelKey.trim(), maxTokens: parseLimit(rawLimit) };
              }),
          },
          warningThresholds: [0.8, 0.9],
        },
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Invalid limit' };
    }
  }, [institutionLimit, memberLimit, mode, modelLimits, timezone]);

  useEffect(() => setPreview(null), [parsed]);
  const previewMutation = useMutation({
    mutationFn: () => {
      if (!parsed.input) {
        throw new Error(parsed.error ?? 'Invalid limit');
      }
      return previewPlatformInstitutionPolicyFn({ data: { tenantId, policy: parsed.input } });
    },
    onSuccess: setPreview,
    onError: (error: Error) => notifyError(error.message),
  });
  const saveMutation = useMutation({
    mutationFn: () => {
      if (!parsed.input) {
        throw new Error(parsed.error ?? 'Invalid limit');
      }
      return createPlatformInstitutionPolicyFn({
        data: {
          tenantId,
          expectedVersion: policy.version,
          policy: parsed.input,
          reason,
          acknowledgeOverage: acknowledge,
        },
      });
    },
    onSuccess: () => {
      notifySuccess('Usage policy saved');
      onSaved();
      setPreview(null);
      setReason('');
    },
    onError: (error: Error) => notifyError(error.message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title={`Policy version ${policy.version + 1}`}>
        <Field label="Mode">
          <select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
            <option value="shadow">Shadow</option>
            <option value="enforce">Enforce</option>
          </select>
        </Field>
        <Field label="Institution timezone">
          <input value={timezone} onChange={(event) => setTimezone(event.target.value)} />
        </Field>
        <Field label="Institution token limit (blank = unlimited)">
          <input
            type="number"
            min={0}
            value={institutionLimit}
            onChange={(event) => setInstitutionLimit(event.target.value)}
          />
        </Field>
        <Field label="Per-member token limit (blank = unlimited)">
          <input
            type="number"
            min={0}
            value={memberLimit}
            onChange={(event) => setMemberLimit(event.target.value)}
          />
        </Field>
        <Field label="Model limits (one canonical-model=limit per line)">
          <textarea
            rows={5}
            value={modelLimits}
            onChange={(event) => setModelLimits(event.target.value)}
          />
        </Field>
        <Field label="Change reason">
          <input value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>
        <div className="flex gap-2">
          <Button
            type="secondary"
            label="Preview"
            disabled={previewMutation.isPending}
            onClick={() => previewMutation.mutate()}
          />
          <Button
            type="primary"
            label="Save version"
            disabled={!preview || !reason.trim() || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          />
        </div>
      </Panel>
      <Panel title="Effective-policy preview">
        {!preview ? (
          <p className="text-sm text-(--cui-color-text-muted)">
            Preview the change before saving it.
          </p>
        ) : (
          <>
            <Detail label="Next reset" value={new Date(preview.range.end).toLocaleString()} />
            <Detail label="Blocked scopes" value={String(preview.blocked.length)} />
            {preview.blocked.map((impact) => (
              <p key={`${impact.scope}:${impact.scopeKey}`} className="text-xs text-amber-400">
                {impact.scope} {impact.scopeKey}: {formatTokens(impact.used + impact.reserved)} /{' '}
                {formatTokens(impact.limit)}
              </p>
            ))}
            {preview.requiresOverageAcknowledgement && (
              <label className="mt-4 flex gap-2 text-sm text-(--cui-color-text-default)">
                <input
                  type="checkbox"
                  checked={acknowledge}
                  onChange={(event) => setAcknowledge(event.target.checked)}
                />
                I understand this change blocks new requests immediately.
              </label>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}

/** Human-readable diff between two policy versions. Policies are immutable, so
 *  the previous version *is* the "before" — no separate audit snapshot needed. */
function describePolicyChanges(
  next: t.UsagePolicy,
  previous: t.UsagePolicy | undefined,
): string[] {
  if (!previous) {
    return ['Initial policy'];
  }
  const changes: string[] = [];
  if (previous.mode !== next.mode) {
    changes.push(`Mode ${previous.mode} → ${next.mode}`);
  }
  if (previous.timezone !== next.timezone) {
    changes.push(`Timezone ${previous.timezone} → ${next.timezone}`);
  }
  if (previous.limits.institutionTokens !== next.limits.institutionTokens) {
    changes.push(
      `Institution limit ${formatTokens(previous.limits.institutionTokens)} → ${formatTokens(
        next.limits.institutionTokens,
      )}`,
    );
  }
  if (previous.limits.memberTokens !== next.limits.memberTokens) {
    changes.push(
      `Member limit ${formatTokens(previous.limits.memberTokens)} → ${formatTokens(
        next.limits.memberTokens,
      )}`,
    );
  }

  const before = new Map(previous.limits.modelTokens.map((e) => [e.modelKey, e.maxTokens]));
  const after = new Map(next.limits.modelTokens.map((e) => [e.modelKey, e.maxTokens]));
  for (const [modelKey, maxTokens] of after) {
    if (!before.has(modelKey)) {
      changes.push(`Added ${modelKey} limit ${formatTokens(maxTokens)}`);
    } else if (before.get(modelKey) !== maxTokens) {
      changes.push(
        `${modelKey} limit ${formatTokens(before.get(modelKey) ?? null)} → ${formatTokens(
          maxTokens,
        )}`,
      );
    }
  }
  for (const modelKey of before.keys()) {
    if (!after.has(modelKey)) {
      changes.push(`Removed ${modelKey} limit`);
    }
  }

  return changes.length > 0 ? changes : ['No effective limit changes'];
}

function History({ policies }: { policies: t.UsagePolicy[] }) {
  if (policies.length === 0) {
    return (
      <Panel title="Policy history">
        <p className="text-sm text-(--cui-color-text-muted)">No policy versions recorded yet.</p>
      </Panel>
    );
  }

  const ascending = [...policies].sort((a, b) => a.version - b.version);
  const previousByVersion = new Map<number, t.UsagePolicy>();
  ascending.forEach((policy, index) => {
    if (index > 0) {
      previousByVersion.set(policy.version, ascending[index - 1]);
    }
  });

  return (
    <Panel title="Policy history">
      {[...ascending].reverse().map((policy) => (
        <div key={policy.version} className="border-b border-(--cui-color-stroke-default) py-3">
          <p className="text-sm font-medium text-(--cui-color-text-default)">
            Version {policy.version} · {policy.mode}
          </p>
          <p className="text-xs text-(--cui-color-text-muted)">
            {policy.reason ?? 'No reason recorded'} ·{' '}
            {new Date(policy.effectiveAt).toLocaleString()}
          </p>
          <ul className="mt-2 flex flex-col gap-0.5">
            {describePolicyChanges(policy, previousByVersion.get(policy.version)).map((change) => (
              <li key={change} className="text-xs text-(--cui-color-text-default)">
                {change}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Panel>
  );
}

function Panel({
  title,
  className = '',
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-panel) p-5 ${className}`}
    >
      <h2 className="mb-4 text-base font-semibold text-(--cui-color-text-default)">{title}</h2>
      {children}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-(--cui-color-text-muted)">{label}</span>
      <span className="text-right text-(--cui-color-text-default)">{value}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-(--cui-color-stroke-default) p-5">
      <p className="text-xs text-(--cui-color-text-muted)">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-(--cui-color-text-default)">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-4 flex flex-col gap-1.5 text-xs text-(--cui-color-text-muted) [&>input]:rounded-lg [&>input]:border [&>input]:border-(--cui-color-stroke-default) [&>input]:bg-(--cui-color-background-default) [&>input]:px-3 [&>input]:py-2 [&>select]:rounded-lg [&>select]:border [&>select]:border-(--cui-color-stroke-default) [&>select]:bg-(--cui-color-background-default) [&>select]:px-3 [&>select]:py-2 [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-(--cui-color-stroke-default) [&>textarea]:bg-(--cui-color-background-default) [&>textarea]:px-3 [&>textarea]:py-2">
      {label}
      {children}
    </label>
  );
}
