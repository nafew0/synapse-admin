import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Activity, Layers, Plus, UserCheck, IdCard } from 'lucide-react';
import type * as t from '@/types';
import {
  formatRelativeTime,
  formatUsageNumber,
  previousRange,
  formatDayLabel,
  formatCompact,
  modelRowKey,
  presetRange,
  fillDaily,
} from '@/utils';
import {
  useUsageTimeseries,
  useMemberSummary,
  useUsageSummary,
  useUsageMembers,
  useUsageModels,
  useCapabilities,
  useLocalize,
} from '@/hooks';
import {
  ChartLegend,
  MeterLegend,
  RangePicker,
  TrendChart,
  ShareBar,
  Sparkline,
  StatTile,
  Delta,
  Meter,
  Card,
  TILE_STAGGER_MS,
  BAR_STAGGER_MS,
} from '@/components/shared';
import { CreateUserDialog } from '@/components/users';
import { SystemCapabilities } from '@/constants';
import { InviteFollowUp } from './InviteFollowUp';

const TOP_ROWS = 5;
const ICON_SIZE = 16;

/** Usage, seats and invites for the signed-in institution admin's own tenant. */
export function Overview() {
  const localize = useLocalize();
  const { hasCapability } = useCapabilities();
  const canManage = hasCapability(SystemCapabilities.MANAGE_USERS);
  const [preset, setPreset] = useState<Exclude<t.RangePreset, 'custom'>>('30d');
  const [inviteOpen, setInviteOpen] = useState(false);

  const range = useMemo(() => presetRange(preset), [preset]);
  const previous = useMemo(() => previousRange(range), [range]);
  const summary = useUsageSummary(range);
  const previousSummary = useUsageSummary(previous);
  const timeseries = useUsageTimeseries(range);
  const models = useUsageModels({ ...range, limit: TOP_ROWS, offset: 0 });
  const members = useUsageMembers({ ...range, limit: TOP_ROWS, offset: 0 });
  const seats = useMemberSummary();

  const series = useMemo(() => {
    const points = timeseries.data?.points ?? [];
    return {
      tokens: fillDaily(points, range, (point) => point.totalTokens),
      requests: fillDaily(points, range, (point) => point.eventCount),
    };
  }, [range, timeseries.data?.points]);

  const current = summary.data?.summary;
  const before = previousSummary.data?.summary;
  const comparedTo = localize('com_dash_vs_previous', { days: series.tokens.length });
  const timezone = timeseries.data?.range.timezone;
  const totalTokens = current?.totalTokens ?? 0;
  const topModelTokens = models.data?.models[0]?.totalTokens ?? 0;
  const topMemberTokens = members.data?.members[0]?.totalTokens ?? 0;

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <div className="flex w-full flex-col gap-5 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <p className="m-0 text-sm text-(--cui-color-text-muted)">
            {localize('com_dash_range_line', {
              start: formatDayLabel(range.start),
              end: formatDayLabel(range.end),
            })}
            {timezone ? ` · ${timezone}` : ''}
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <RangePicker value={preset} onChange={(next) => setPreset(next as typeof preset)} />
            {canManage ? (
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border-0 bg-(--cui-color-accent) px-4 text-sm font-bold text-(--syn-on-accent) transition hover:brightness-95"
              >
                <Plus aria-hidden="true" size={16} strokeWidth={2.4} />
                {localize('com_users_invite_member')}
              </button>
            ) : null}
          </div>
        </div>

        <section
          aria-label={localize('com_dash_key_figures')}
          className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-4"
        >
          <StatTile
            label={localize('com_dash_tokens_used')}
            value={formatCompact(totalTokens)}
            icon={<Layers size={ICON_SIZE} />}
            index={0}
            detail={<Delta current={totalTokens} previous={before?.totalTokens} suffix={comparedTo} />}
          >
            <Sparkline values={series.tokens.map((datum) => datum.value)} delay={0} />
          </StatTile>
          <StatTile
            label={localize('com_dash_requests')}
            value={formatUsageNumber(current?.eventCount ?? 0)}
            icon={<Activity size={ICON_SIZE} />}
            index={1}
            detail={
              <Delta current={current?.eventCount ?? 0} previous={before?.eventCount} suffix={comparedTo} />
            }
          >
            <Sparkline values={series.requests.map((datum) => datum.value)} delay={TILE_STAGGER_MS} />
          </StatTile>
          <AdoptionTile
            used={current?.memberCount ?? 0}
            previous={before?.memberCount}
            active={seats?.activeMembers}
            suffix={comparedTo}
          />
          <SeatsTile seats={seats} />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card
            className="xl:col-span-2"
            title={localize('com_dash_token_trend')}
            description={localize('com_dash_token_trend_desc', { total: formatCompact(totalTokens) })}
            action={
              <ChartLegend
                items={[
                  { label: localize('com_dash_tokens_per_day'), color: 'var(--syn-chart-1)' },
                  { label: localize('com_chart_7d_average'), color: 'var(--syn-chart-avg)' },
                ]}
              />
            }
          >
            <TrendChart
              data={series.tokens}
              label={localize('com_dash_tokens_per_day')}
              averageLabel={localize('com_chart_7d_average')}
              formatValue={formatCompact}
              formatDay={(day) => formatDayLabel(day, { weekday: 'short', day: 'numeric', month: 'short' })}
              detailRows={(index) => [
                {
                  label: localize('com_dash_requests'),
                  value: formatUsageNumber(series.requests[index]?.value ?? 0),
                },
              ]}
            />
          </Card>

          <Card
            title={localize('com_dash_tokens_by_model')}
            action={<DetailsLink />}
          >
            {(models.data?.models ?? []).length === 0 ? (
              <EmptyRow text={localize('com_dash_no_usage')} />
            ) : (
              <ul className="m-0 flex list-none flex-col gap-4 p-0">
                {(models.data?.models ?? []).map((model, order) => (
                  <li key={modelRowKey(model)} className="flex flex-col gap-1.5">
                    <div className="flex justify-between gap-3 text-[13px]">
                      <span className="truncate font-semibold">{model.displayName ?? model.modelKey}</span>
                      <span className="shrink-0 text-(--cui-color-text-muted) tabular-nums">
                        <b className="text-(--cui-color-text-default)">{formatCompact(model.totalTokens)}</b>
                        {totalTokens > 0 ? ` · ${Math.round((model.totalTokens / totalTokens) * 100)}%` : ''}
                      </span>
                    </div>
                    <ShareBar
                      value={model.totalTokens}
                      max={topModelTokens}
                      className="h-2"
                      growDelay={300 + order * BAR_STAGGER_MS}
                    />
                    <span className="text-xs text-(--cui-color-text-muted)">
                      {localize('com_dash_model_line', {
                        members: formatUsageNumber(model.memberCount),
                        requests: formatUsageNumber(model.eventCount),
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card
            className="xl:col-span-2"
            title={localize('com_dash_top_members')}
            action={<DetailsLink />}
          >
            {(members.data?.members ?? []).length === 0 ? (
              <EmptyRow text={localize('com_dash_no_usage')} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-120 border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="text-xs text-(--cui-color-text-muted)">
                      <th className="py-2 font-medium">{localize('com_dash_member')}</th>
                      <th className="w-2/5 py-2 font-medium">{localize('com_dash_tokens')}</th>
                      <th className="py-2 text-right font-medium">{localize('com_dash_requests')}</th>
                      <th className="py-2 text-right font-medium">{localize('com_dash_last_used')}</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {(members.data?.members ?? []).map((member) => (
                      <tr key={member.userId} className="border-t border-(--cui-color-stroke-muted)">
                        <td className="py-2.5 pr-4">
                          <div className="font-semibold">{member.name}</div>
                          <div className="text-xs text-(--cui-color-text-muted)">{member.email}</div>
                        </td>
                        <td className="pr-4">
                          <div className="flex items-center gap-3">
                            <ShareBar value={member.totalTokens} max={topMemberTokens} />
                            <span className="w-14 shrink-0 text-right font-semibold">
                              {formatCompact(member.totalTokens)}
                            </span>
                          </div>
                        </td>
                        <td className="text-right">{formatUsageNumber(member.eventCount)}</td>
                        <td className="text-right text-(--cui-color-text-muted)">
                          {formatRelativeTime(member.lastUsedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <InviteFollowUp canManage={canManage} />
        </section>
      </div>
      <CreateUserDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}

function AdoptionTile({
  used,
  previous,
  active,
  suffix,
}: {
  used: number;
  previous: number | undefined;
  active: number | undefined;
  suffix: string;
}) {
  const localize = useLocalize();
  const share = active ? Math.round((used / active) * 100) : null;
  return (
    <StatTile
      label={localize('com_dash_members_using')}
      value={formatUsageNumber(used)}
      icon={<UserCheck size={ICON_SIZE} />}
      index={2}
      detail={
        active != null ? (
          <span className="flex flex-col gap-2">
            <span>{localize('com_dash_of_active', { active: formatUsageNumber(active), share: share ?? 0 })}</span>
            <Meter
              max={active}
              ariaLabel={localize('com_dash_of_active', { active: formatUsageNumber(active), share: share ?? 0 })}
              segments={[{ value: used, color: 'var(--syn-chart-1)', label: localize('com_dash_members_using') }]}
              className="w-44"
            />
            <Delta current={used} previous={previous} suffix={suffix} />
          </span>
        ) : (
          <Delta current={used} previous={previous} suffix={suffix} />
        )
      }
    />
  );
}

function SeatsTile({ seats }: { seats: t.InstitutionSeatSummary | undefined }) {
  const localize = useLocalize();
  if (!seats) {
    return <StatTile label={localize('com_dash_seats')} value="—" icon={<IdCard size={ICON_SIZE} />} index={3} />;
  }
  const used = seats.activeMembers + seats.pendingInvites;
  const max = seats.maxActiveMembers;
  const segments: t.MeterSegment[] = [
    {
      value: seats.activeMembers,
      color: 'var(--syn-chart-1)',
      label: localize('com_dash_seats_active', { count: seats.activeMembers }),
    },
    {
      value: seats.pendingInvites,
      color: 'var(--syn-chart-2)',
      label: localize('com_dash_seats_invited', { count: seats.pendingInvites }),
    },
  ];
  return (
    <StatTile
      label={localize('com_dash_seats')}
      value={formatUsageNumber(used)}
      icon={<IdCard size={ICON_SIZE} />}
      index={3}
      detail={
        <span className="flex flex-col gap-2">
          <span>
            {max != null
              ? localize('com_dash_seats_of', { max: formatUsageNumber(max), free: formatUsageNumber(Math.max(max - used, 0)) })
              : localize('com_dash_seats_unlimited')}
          </span>
          {max != null ? (
            <Meter
              max={max}
              segments={segments}
              ariaLabel={segments.map((segment) => segment.label).join(', ')}
              className="w-44"
            />
          ) : null}
          <MeterLegend segments={segments} />
        </span>
      }
    />
  );
}

function DetailsLink() {
  const localize = useLocalize();
  return (
    <Link to="/usage" className="text-[13px] font-semibold text-(--cui-color-text-link)">
      {localize('com_dash_view_usage')}
    </Link>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="m-0 py-6 text-center text-sm text-(--cui-color-text-muted)">{text}</p>;
}
