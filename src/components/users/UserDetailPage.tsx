import { useState, type ReactNode } from 'react';
import { Button } from '@clickhouse/click-ui';
import { Link, getRouteApi } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type * as t from '@/types';
import {
  getUserCreditsFn,
  getUserDetailFn,
  getUserUsageFn,
  grantCreditsFn,
} from '@/server';
import { Avatar, EmptyState, LoadingState } from '@/components/shared';
import { SystemCapabilities } from '@/constants';
import { useCapabilities } from '@/hooks';
import { notifyError, notifySuccess } from '@/utils';

const Route = getRouteApi('/_app/users/$userId');
const AppRoute = getRouteApi('/_app');
type Tab = 'overview' | 'usage' | 'credits';

function monthStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function monthEnd(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
}

function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat().format(Math.round(value ?? 0));
}

function formatDate(value?: string | null): string {
  return value ? new Date(value).toLocaleString() : '—';
}

function formatCost(credits: number): string {
  const usd = credits / 1_000_000;
  if (usd === 0) return '$0.00';
  if (Math.abs(usd) < 0.01) return `$${usd.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')}`;
  return `$${usd.toFixed(2)}`;
}

export function UserDetailPage() {
  const { user } = AppRoute.useRouteContext();
  const { userId } = Route.useParams();
  const queryClient = useQueryClient();
  const { hasCapability, isLoading: capabilitiesLoading, isError: capabilitiesError } = useCapabilities();
  const isPlatform = user?.isPlatformSuperadmin === true;
  const canRead = hasCapability(SystemCapabilities.READ_USERS);
  const canManage = hasCapability(SystemCapabilities.MANAGE_USERS);
  const [tab, setTab] = useState<Tab>('overview');
  const [start, setStart] = useState(monthStart);
  const [end, setEnd] = useState(monthEnd);
  const [packageId, setPackageId] = useState('');

  const detailQuery = useQuery({
    queryKey: ['user-detail', userId, isPlatform],
    queryFn: () => getUserDetailFn({ data: { userId, platform: isPlatform } }),
  });
  const usageQuery = useQuery({
    queryKey: ['user-usage', userId, isPlatform, start, end],
    queryFn: () => getUserUsageFn({ data: { userId, platform: isPlatform, start, end } }),
    enabled: tab === 'usage',
  });
  const creditsQuery = useQuery({
    queryKey: ['user-credits', userId, isPlatform],
    queryFn: () => getUserCreditsFn({ data: { userId, platform: isPlatform } }),
    enabled: tab === 'overview' || tab === 'credits',
  });
  const grantMutation = useMutation({
    mutationFn: () => grantCreditsFn({ data: { userId, packageId, platform: isPlatform } }),
    onSuccess: () => {
      setPackageId('');
      queryClient.invalidateQueries({ queryKey: ['user-credits', userId, isPlatform] });
      notifySuccess('Credits granted');
    },
    onError: (error: Error) => notifyError(error.message),
  });

  if (capabilitiesLoading) return null;
  if (capabilitiesError || !canRead) {
    return <EmptyState message="Administrator access is required to view user details." />;
  }
  if (detailQuery.isLoading) return <LoadingState />;
  if (detailQuery.isError || !detailQuery.data?.member) {
    return <EmptyState message={detailQuery.error?.message || 'Failed to load user details.'} />;
  }

  const member = detailQuery.data.member;
  const grants = creditsQuery.data?.grants ?? [];
  const packages = creditsQuery.data?.packages?.list ?? [];
  const latestGrant = grants[0];

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-auto p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/users" className="text-xs text-(--cui-color-text-muted)">
            ← Users
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <Avatar name={member.name || member.email} size="md" />
            <div>
              <h1 className="text-2xl font-semibold text-(--cui-color-text-default)">
                {member.name || 'Unnamed user'}
              </h1>
              <p className="text-sm text-(--cui-color-text-muted)">{member.email}</p>
            </div>
          </div>
        </div>
        <span className="rounded-full bg-(--cui-color-background-secondary) px-3 py-1 text-xs text-(--cui-color-text-default)">
          {member.status}
        </span>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-(--cui-color-stroke-default) pb-3">
        {(['overview', 'usage', 'credits'] as const).map((item) => (
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
            {item === 'usage' ? 'Usage & model breakdown' : item === 'credits' ? 'Credit & grant history' : 'Overview'}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <Overview
          member={member}
          balance={creditsQuery.data?.balance ?? 0}
          latestGrant={latestGrant}
          packages={packages}
        />
      )}
      {tab === 'usage' && (
        <Usage
          usage={usageQuery.data}
          loading={usageQuery.isLoading}
          error={usageQuery.error?.message}
          start={start}
          end={end}
          onStartChange={setStart}
          onEndChange={setEnd}
        />
      )}
      {tab === 'credits' && (
        <Credits
          balance={creditsQuery.data?.balance ?? 0}
          grants={grants}
          packages={packages}
          packageId={packageId}
          canManage={canManage}
          loading={creditsQuery.isLoading}
          packagesLoading={creditsQuery.isLoading}
          granting={grantMutation.isPending}
          onPackageChange={setPackageId}
          onGrant={() => grantMutation.mutate()}
        />
      )}
    </div>
  );
}

function Overview({ member, balance, latestGrant, packages }: { member: t.InstitutionMember; balance: number; latestGrant?: t.CreditGrant; packages: t.CreditPackage[] }) {
  const latestPackage = packages.find((pkg) => pkg.id === latestGrant?.packageId);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Panel title="Profile">
        <Detail label="Username" value={member.username} />
        <Detail label="Email" value={member.email} />
        <Detail label="Email verification" value={member.emailVerified ? 'Verified' : 'Pending'} />
        <Detail label="Role" value={member.role === 'INSTITUTION_ADMIN' ? 'Institution admin' : 'Member'} />
        <Detail label="Institution" value={member.institutionName || member.tenantId || 'Others'} />
        <Detail label="Created" value={formatDate(member.createdAt)} />
      </Panel>
      <Panel title="Plan & balance">
        <Detail label="Current balance" value={`${formatNumber(balance)} credits`} />
        <Detail label="Latest package" value={latestPackage?.label || latestGrant?.packageId || 'No package grant recorded'} />
        <Detail label="Package ID" value={latestGrant?.packageId} />
        <Detail label="Latest grant" value={latestGrant ? `${formatNumber(latestGrant.credits)} credits` : '—'} />
        <Detail label="Package price" value={latestGrant ? `${latestGrant.price} ${latestGrant.currency}` : '—'} />
      </Panel>
    </div>
  );
}

function Usage({ usage, loading, error, start, end, onStartChange, onEndChange }: { usage?: t.UserUsageResponse; loading: boolean; error?: string; start: string; end: string; onStartChange: (value: string) => void; onEndChange: (value: string) => void }) {
  if (loading) return <LoadingState />;
  if (error || !usage) return <EmptyState message={error || 'No usage data available.'} />;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-(--cui-color-text-muted)">Start<input type="date" value={start} onChange={(event) => onStartChange(event.target.value)} className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)" /></label>
        <label className="flex flex-col gap-1 text-xs text-(--cui-color-text-muted)">End<input type="date" value={end} onChange={(event) => onEndChange(event.target.value)} className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)" /></label>
        <span className="pb-2 text-xs text-(--cui-color-text-muted)">Timezone: {usage.range.timezone || 'UTC'}</span>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Total tokens" value={formatNumber(usage.summary.totalTokens)} detail={`${formatNumber(usage.summary.promptTokens)} prompt / ${formatNumber(usage.summary.completionTokens)} completion`} />
        <Metric label="Usage cost" value={formatCost(usage.summary.totalCost)} detail={`${formatNumber(usage.summary.totalCost)} credits`} />
        <Metric label="Events" value={formatNumber(usage.summary.eventCount)} />
        <Metric label="Last used" value={formatDate(usage.summary.lastUsedAt)} />
      </div>
      <Panel title="Model breakdown">
        {usage.models.length === 0 ? <p className="text-sm text-(--cui-color-text-muted)">No model usage in this range.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm"><thead><tr className="border-b border-(--cui-color-stroke-default) text-xs text-(--cui-color-text-muted)"><th className="px-2 py-2">Provider</th><th className="px-2 py-2">Model</th><th className="px-2 py-2 text-right">Prompt</th><th className="px-2 py-2 text-right">Completion</th><th className="px-2 py-2 text-right">Total</th><th className="px-2 py-2 text-right">Cost</th><th className="px-2 py-2 text-right">Events</th></tr></thead><tbody>{usage.models.map((model) => <tr key={`${model.providerKey}:${model.modelKey}`} className="border-b border-(--cui-color-stroke-default)"><td className="px-2 py-2">{model.providerKey || 'unknown'}</td><td className="px-2 py-2">{model.modelKey}</td><td className="px-2 py-2 text-right">{formatNumber(model.promptTokens)}</td><td className="px-2 py-2 text-right">{formatNumber(model.completionTokens)}</td><td className="px-2 py-2 text-right">{formatNumber(model.totalTokens)}</td><td className="px-2 py-2 text-right">{formatNumber(model.totalCost)}</td><td className="px-2 py-2 text-right">{formatNumber(model.eventCount)}</td></tr>)}</tbody></table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function Credits({ balance, grants, packages, packageId, canManage, loading, packagesLoading, granting, onPackageChange, onGrant }: { balance: number; grants: t.CreditGrant[]; packages: t.CreditPackage[]; packageId: string; canManage: boolean; loading: boolean; packagesLoading: boolean; granting: boolean; onPackageChange: (value: string) => void; onGrant: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <Panel title="Current balance"><p className="text-2xl font-semibold text-(--cui-color-text-default)">{formatNumber(balance)} credits</p></Panel>
      {canManage && <Panel title="Grant credits"><div className="flex flex-wrap gap-2"><select value={packageId} onChange={(event) => onPackageChange(event.target.value)} disabled={packagesLoading || granting} className="min-w-64 rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"><option value="">{packagesLoading ? 'Loading packages…' : 'Select package'}</option>{packages.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.label} · {formatNumber(pkg.credits)} credits</option>)}</select><Button label="Grant" disabled={!packageId || granting} onClick={onGrant} /></div></Panel>}
      <Panel title="Grant history">{loading ? <LoadingState /> : grants.length === 0 ? <p className="text-sm text-(--cui-color-text-muted)">No grants recorded.</p> : <div className="divide-y divide-(--cui-color-stroke-default)">{grants.map((grant) => <div key={grant._id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><p className="font-medium text-(--cui-color-text-default)">{grant.packageId}</p><p className="text-xs text-(--cui-color-text-muted)">{formatDate(grant.createdAt)} · {grant.source}</p></div><div className="text-right"><p>{formatNumber(grant.credits)} credits</p><p className="text-xs text-(--cui-color-text-muted)">{grant.price} {grant.currency}</p></div></div>)}</div>}</Panel>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-panel) p-4"><h2 className="mb-3 text-sm font-semibold text-(--cui-color-text-default)">{title}</h2>{children}</section>;
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return <div className="flex items-start justify-between gap-3 border-b border-(--cui-color-stroke-default) py-2 text-sm last:border-b-0"><span className="text-(--cui-color-text-muted)">{label}</span><span className="text-right text-(--cui-color-text-default)">{value || '—'}</span></div>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-panel) p-4"><p className="text-xs text-(--cui-color-text-muted)">{label}</p><p className="mt-1 text-xl font-semibold text-(--cui-color-text-default)">{value}</p>{detail ? <p className="mt-1 text-xs text-(--cui-color-text-muted)">{detail}</p> : null}</div>;
}
