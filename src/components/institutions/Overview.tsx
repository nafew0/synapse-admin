import { useMemo } from 'react';
import { Button } from '@clickhouse/click-ui';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, CheckCircle2, IdCard, Layers, UserCheck } from 'lucide-react';
import type * as t from '@/types';
import {
  formatRelativeTime,
  formatUsageNumber,
  formatUsageCost,
  formatDayLabel,
  formatCompact,
  previousRange,
  modelRowKey,
  presetRange,
  currentWeek,
  fillDaily,
  localDay,
  institutionAttention,
  IDLE_DAYS,
} from '@/utils';
import {
  useUsageTimeseries,
  useUsageSummary,
  useUsageMembers,
  useUsageModels,
  useLocalize,
} from '@/hooks';
import {
  MeterLegend,
  TrendChart,
  ShareBar,
  Sparkline,
  StatTile,
  Delta,
  Meter,
  Card,
  BAR_STAGGER_MS,
  TILE_STAGGER_MS,
} from '@/components/shared';
import { getMembersFn } from '@/server';

const TOP_ROWS = 5;
const ALL_MODELS = 100;
const ICON_SIZE = 16;

interface InstitutionOverviewProps {
  institution: t.PlatformInstitution;
  admins: t.InstitutionMember[];
  adminsLoading: boolean;
  adminsError: boolean;
  revoking: boolean;
  onRevokeAdmin: (admin: t.InstitutionMember) => void;
  onOpenMembers: () => void;
}

/** How many invitations match a roster status, read from the list total. */
function useInviteCount(tenantId: string, status: 'invited' | 'expired') {
  return useQuery({
    queryKey: ['platformInstitutionInviteCount', tenantId, status],
    queryFn: () =>
      getMembersFn({
        data: { platform: true, tenantId, limit: 1, offset: 0, status, role: 'all' },
      }),
    select: (data) => data.total,
  });
}

/**
 * A superadmin's first look at one institution: what needs their attention, how many
 * people joined and use Synapse, the last 30 days of usage, and who administers it.
 */
export function InstitutionOverview({
  institution,
  admins,
  adminsLoading,
  adminsError,
  revoking,
  onRevokeAdmin,
  onOpenMembers,
}: InstitutionOverviewProps) {
  const localize = useLocalize();
  const { tenantId } = institution;
  const today = localDay();
  const range = useMemo(() => presetRange('30d'), []);
  const previous = useMemo(() => previousRange(range), [range]);
  const week = useMemo(() => currentWeek(today), [today]);

  const summary = useUsageSummary({ ...range, tenantId });
  const previousSummary = useUsageSummary({ ...previous, tenantId });
  const weekSummary = useUsageSummary({ ...week, tenantId });
  const timeseries = useUsageTimeseries({ ...range, tenantId });
  const members = useUsageMembers({ ...range, tenantId, limit: TOP_ROWS, offset: 0 });
  const models = useUsageModels({ ...range, tenantId, limit: ALL_MODELS, offset: 0 });
  const invited = useInviteCount(tenantId, 'invited');
  const expired = useInviteCount(tenantId, 'expired');

  const current = summary.data?.summary;
  const before = previousSummary.data?.summary;
  const joined = institution.stats?.activeMembers ?? 0;
  const maxSeats = institution.limits?.maxActiveMembers ?? null;
  const validInvites = invited.data ?? 0;
  const expiredInvites = expired.data ?? 0;
  const comparedTo = localize('com_dash_vs_previous', { days: 30 });

  const series = useMemo(() => {
    const points = timeseries.data?.points ?? [];
    const lastActive = points.reduce<string | null>(
      (latest, point) => (point.eventCount > 0 && (!latest || point.day > latest) ? point.day : latest),
      null,
    );
    return {
      tokens: fillDaily(points, range, (point) => point.totalTokens),
      requests: fillDaily(points, range, (point) => point.eventCount),
      lastActive,
    };
  }, [range, timeseries.data?.points]);

  const mostUsed = useMemo(() => {
    const rows = models.data?.models ?? [];
    const requests = rows.reduce((sum, model) => sum + model.eventCount, 0);
    const top = [...rows].sort((a, b) => b.eventCount - a.eventCount).slice(0, TOP_ROWS);
    return { top, requests, peak: top[0]?.eventCount ?? 0 };
  }, [models.data?.models]);

  const attention = useMemo(
    () =>
      institutionAttention({
        status: institution.status,
        adminCount: adminsLoading || adminsError ? null : admins.length,
        joined,
        validInvites,
        maxSeats,
        expiredInvites: expired.isSuccess ? expiredInvites : null,
        lastActiveDay: timeseries.isSuccess ? series.lastActive : undefined,
        today,
      }),
    [
      admins.length,
      adminsError,
      adminsLoading,
      expired.isSuccess,
      expiredInvites,
      institution.status,
      joined,
      maxSeats,
      series.lastActive,
      timeseries.isSuccess,
      today,
      validInvites,
    ],
  );

  const loading = summary.isLoading;
  const placeholder = (value: string) => (loading ? '—' : value);
  const usedMonth = current?.memberCount ?? 0;
  const usedWeek = weekSummary.data?.summary.memberCount ?? 0;
  const topMemberTokens = members.data?.members[0]?.totalTokens ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <AttentionCard items={attention} onOpenMembers={onOpenMembers} />

      <section
        aria-label={localize('com_dash_key_figures')}
        className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-4"
      >
        <SeatsTile joined={joined} invited={validInvites} max={maxSeats} />
        <StatTile
          label={localize('com_inst_active_30d')}
          value={placeholder(formatUsageNumber(usedMonth))}
          icon={<UserCheck size={ICON_SIZE} />}
          index={1}
          detail={
            <span className="flex flex-col gap-1">
              {joined > 0 ? (
                <span>
                  {localize('com_dash_active_share', {
                    share: Math.round((usedMonth / joined) * 100),
                    active: formatUsageNumber(joined),
                  })}
                </span>
              ) : null}
              <Delta current={usedMonth} previous={before?.memberCount} suffix={comparedTo} />
            </span>
          }
        />
        <StatTile
          label={localize('com_inst_requests_30d')}
          value={placeholder(formatUsageNumber(current?.eventCount ?? 0))}
          icon={<Activity size={ICON_SIZE} />}
          index={2}
          detail={<Delta current={current?.eventCount ?? 0} previous={before?.eventCount} suffix={comparedTo} />}
        >
          <Sparkline values={series.requests.map((datum) => datum.value)} delay={2 * TILE_STAGGER_MS} />
        </StatTile>
        <StatTile
          label={localize('com_inst_tokens_30d')}
          value={placeholder(formatCompact(current?.totalTokens ?? 0))}
          icon={<Layers size={ICON_SIZE} />}
          index={3}
          detail={
            <span className="flex flex-col gap-1">
              <Delta current={current?.totalTokens ?? 0} previous={before?.totalTokens} suffix={comparedTo} />
              {current?.totalCost != null ? (
                <span>{localize('com_inst_cost_estimate', { cost: formatUsageCost(current.totalCost) })}</span>
              ) : null}
            </span>
          }
        >
          <Sparkline values={series.tokens.map((datum) => datum.value)} delay={3 * TILE_STAGGER_MS} />
        </StatTile>
      </section>

      <section className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title={localize('com_inst_trend_title')}
          description={
            series.lastActive
              ? localize('com_inst_last_active', { day: formatDayLabel(series.lastActive) })
              : localize('com_dash_no_usage')
          }
        >
          {timeseries.isLoading ? (
            <EmptyRow text={localize('com_ui_loading')} />
          ) : (
            <TrendChart
              data={series.tokens}
              label={localize('com_dash_tokens')}
              averageLabel={localize('com_chart_7d_average')}
              formatValue={formatCompact}
              formatDay={(day) => formatDayLabel(day)}
              detailRows={(index) => [
                {
                  label: localize('com_dash_requests'),
                  value: formatUsageNumber(series.requests[index]?.value ?? 0),
                },
              ]}
              height={220}
            />
          )}
        </Card>

        <AdoptionCard
          joined={joined}
          usedMonth={usedMonth}
          usedWeek={usedWeek}
          validInvites={validInvites}
          expiredInvites={expiredInvites}
          loading={summary.isLoading || weekSummary.isLoading}
        />
      </section>

      <section className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" title={localize('com_dash_top_members')}>
          {(members.data?.members ?? []).length === 0 ? (
            <EmptyRow text={localize(members.isLoading ? 'com_ui_loading' : 'com_dash_no_usage')} />
          ) : (
            <ul className="m-0 flex list-none flex-col p-0 tabular-nums">
              {(members.data?.members ?? []).map((member, order) => (
                <li
                  key={member.userId}
                  className="flex items-center gap-4 border-t border-(--cui-color-stroke-muted) py-2.5 text-[13px] first:border-t-0"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{member.name}</span>
                    <span className="truncate text-xs text-(--cui-color-text-muted)">{member.email}</span>
                  </span>
                  <div className="hidden w-28 shrink-0 sm:block">
                    <ShareBar
                      value={member.totalTokens}
                      max={topMemberTokens}
                      growDelay={500 + order * BAR_STAGGER_MS}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right font-semibold">{formatCompact(member.totalTokens)}</span>
                  <span className="hidden w-28 shrink-0 text-right text-(--cui-color-text-muted) sm:block">
                    {formatRelativeTime(member.lastUsedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={localize('com_dash_most_used_models')}>
          {mostUsed.top.length === 0 ? (
            <EmptyRow text={localize(models.isLoading ? 'com_ui_loading' : 'com_dash_no_usage')} />
          ) : (
            <ul className="m-0 flex list-none flex-col gap-4 p-0">
              {mostUsed.top.map((model, order) => (
                <li key={modelRowKey(model)} className="flex flex-col gap-1.5">
                  <div className="flex justify-between gap-3 text-[13px]">
                    <span className="truncate font-semibold">{model.displayName ?? model.modelKey}</span>
                    <span className="shrink-0 text-(--cui-color-text-muted) tabular-nums">
                      <b className="text-(--cui-color-text-default)">
                        {localize('com_dash_model_requests', { count: formatUsageNumber(model.eventCount) })}
                      </b>
                      {mostUsed.requests > 0
                        ? ` · ${Math.round((model.eventCount / mostUsed.requests) * 100)}%`
                        : ''}
                    </span>
                  </div>
                  <ShareBar
                    value={model.eventCount}
                    max={mostUsed.peak}
                    className="h-2"
                    growDelay={500 + order * BAR_STAGGER_MS}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <Card title={localize('com_inst_admins_title')}>
          <AdminList
            admins={admins}
            loading={adminsLoading}
            error={adminsError}
            revoking={revoking}
            onRevoke={onRevokeAdmin}
          />
        </Card>
        <Card title={localize('com_inst_details_title')}>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-[13px]">
            <DetailRow label={localize('com_inst_detail_timezone')} value={institution.timezone ?? '—'} />
            <DetailRow
              label={localize('com_inst_detail_domains')}
              value={
                institution.authDomains?.length
                  ? institution.authDomains.join(', ')
                  : localize('com_inst_detail_domains_any')
              }
            />
            <DetailRow
              label={localize('com_inst_detail_created')}
              value={
                institution.createdAt
                  ? formatDayLabel(institution.createdAt.slice(0, 10), {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'
              }
            />
            <DetailRow label={localize('com_inst_detail_slug')} value={institution.slug ?? '—'} />
            <DetailRow label={localize('com_inst_detail_tenant')} value={tenantId} />
          </dl>
        </Card>
      </section>
    </div>
  );
}

function attentionText(item: t.InstitutionAttention, localize: ReturnType<typeof useLocalize>): string {
  switch (item.key) {
    case 'suspended':
      return localize('com_inst_attention_suspended');
    case 'no_admin':
      return localize('com_inst_attention_no_admin');
    case 'idle':
      return localize('com_inst_attention_idle', { days: IDLE_DAYS });
    case 'seats':
      return localize('com_inst_attention_seats', {
        used: formatUsageNumber(item.used),
        max: formatUsageNumber(item.max),
      });
    case 'expired':
      return localize('com_inst_attention_expired', { count: formatUsageNumber(item.count) });
  }
}

function AttentionCard({ items, onOpenMembers }: { items: t.InstitutionAttention[]; onOpenMembers: () => void }) {
  const localize = useLocalize();
  if (items.length === 0) {
    return (
      <p className="m-0 flex items-center gap-2 rounded-xl border border-(--cui-color-stroke-default) bg-(--syn-surface) px-4 py-3 text-[13px] text-(--cui-color-text-muted)">
        <CheckCircle2 aria-hidden="true" size={16} className="shrink-0 text-(--syn-success-fg)" />
        {localize('com_inst_attention_none')}
      </p>
    );
  }
  return (
    <section
      aria-label={localize('com_inst_attention_title')}
      className="flex flex-col gap-2 rounded-xl bg-(--syn-warning-bg) px-4 py-3"
    >
      <h2 className="m-0 flex items-center gap-2 text-[13px] font-semibold text-(--syn-warning-fg)">
        <AlertTriangle aria-hidden="true" size={16} className="shrink-0" />
        {localize('com_inst_attention_title')}
      </h2>
      <ul className="m-0 flex list-disc flex-col gap-1 pl-10 text-[13px] text-(--cui-color-text-default)">
        {items.map((item) => (
          <li key={item.key}>
            {attentionText(item, localize)}
            {item.key === 'expired' ? (
              <button
                type="button"
                onClick={onOpenMembers}
                className="ml-2 cursor-pointer border-0 bg-transparent p-0 text-[13px] font-semibold text-(--cui-color-text-link)"
              >
                {localize('com_inst_open_members')}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SeatsTile({ joined, invited, max }: { joined: number; invited: number; max: number | null }) {
  const localize = useLocalize();
  const used = joined + invited;
  const segments: t.MeterSegment[] = [
    { value: joined, color: 'var(--syn-chart-1)', label: localize('com_dash_seats_active', { count: joined }) },
    { value: invited, color: 'var(--syn-chart-2)', label: localize('com_dash_seats_invited', { count: invited }) },
  ];
  return (
    <StatTile
      label={localize('com_dash_seats')}
      value={max != null ? `${formatUsageNumber(used)} / ${formatUsageNumber(max)}` : formatUsageNumber(used)}
      icon={<IdCard size={ICON_SIZE} />}
      index={0}
      detail={
        <span className="flex flex-col gap-2">
          {max != null ? (
            <Meter
              max={max}
              segments={segments}
              ariaLabel={segments.map((segment) => segment.label).join(', ')}
              className="w-44"
            />
          ) : (
            <span>{localize('com_dash_seats_unlimited')}</span>
          )}
          <MeterLegend segments={segments} />
        </span>
      }
    />
  );
}

/** Joined members narrowing to those who used Synapse this month and this week. */
function AdoptionCard({
  joined,
  usedMonth,
  usedWeek,
  validInvites,
  expiredInvites,
  loading,
}: {
  joined: number;
  usedMonth: number;
  usedWeek: number;
  validInvites: number;
  expiredInvites: number;
  loading: boolean;
}) {
  const localize = useLocalize();
  const steps = [
    { key: 'joined', label: localize('com_inst_funnel_joined'), value: joined },
    { key: 'month', label: localize('com_inst_funnel_month'), value: usedMonth },
    { key: 'week', label: localize('com_inst_funnel_week'), value: usedWeek },
  ];
  return (
    <Card title={localize('com_inst_adoption_title')} description={localize('com_inst_adoption_desc')}>
      <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
        {steps.map((step, order) => (
          <li key={step.key} className="flex flex-col gap-1.5">
            <div className="flex justify-between gap-3 text-[13px]">
              <span className="font-semibold">{step.label}</span>
              <span className="text-(--cui-color-text-muted) tabular-nums">
                <b className="text-(--cui-color-text-default)">{loading ? '—' : formatUsageNumber(step.value)}</b>
                {joined > 0 && order > 0 ? ` · ${Math.round((step.value / joined) * 100)}%` : ''}
              </span>
            </div>
            <ShareBar value={step.value} max={joined} className="h-2" growDelay={500 + order * BAR_STAGGER_MS} />
          </li>
        ))}
      </ul>
      <p className="m-0 border-t border-(--cui-color-stroke-muted) pt-3 text-[13px] text-(--cui-color-text-muted)">
        {localize('com_inst_invites_line', {
          valid: formatUsageNumber(validInvites),
          expired: formatUsageNumber(expiredInvites),
        })}
      </p>
    </Card>
  );
}

function AdminList({
  admins,
  loading,
  error,
  revoking,
  onRevoke,
}: {
  admins: t.InstitutionMember[];
  loading: boolean;
  error: boolean;
  revoking: boolean;
  onRevoke: (admin: t.InstitutionMember) => void;
}) {
  const localize = useLocalize();
  if (error) {
    return <EmptyRow text={localize('com_inst_admins_error')} />;
  }
  if (loading) {
    return <EmptyRow text={localize('com_ui_loading')} />;
  }
  if (admins.length === 0) {
    return <EmptyRow text={localize('com_inst_attention_no_admin')} />;
  }
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {admins.map((admin) => (
        <li
          key={admin.id}
          className="flex items-center gap-3 border-t border-(--cui-color-stroke-muted) py-2.5 first:border-t-0"
        >
          <span className="flex min-w-0 flex-1 flex-col text-[13px]">
            <span className="truncate font-semibold">{admin.name || admin.email}</span>
            <span className="truncate text-xs text-(--cui-color-text-muted)">{admin.email}</span>
          </span>
          <Button
            type="secondary"
            label={localize('com_inst_admin_revoke')}
            disabled={revoking}
            onClick={() => onRevoke(admin)}
          />
        </li>
      ))}
    </ul>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-(--cui-color-text-muted)">{label}</dt>
      <dd className="m-0 min-w-0 truncate font-medium">{value}</dd>
    </>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="m-0 py-6 text-center text-sm text-(--cui-color-text-muted)">{text}</p>;
}
