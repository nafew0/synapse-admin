import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Activity, Layers, Plus, UserCheck, IdCard } from 'lucide-react';
import type { ReactNode } from 'react';
import type * as t from '@/types';
import {
  formatRelativeTime,
  formatUsageNumber,
  percentChange,
  previousRange,
  formatDayLabel,
  formatCompact,
  currentWeek,
  addDays,
  sameDaysLastMonth,
  modelRowKey,
  presetRange,
  localDay,
  fillDaily,
  cn,
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
  MeterLegend,
  RangePicker,
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
import { WeekdayUsage } from './WeekdayUsage';
import { WeekChart } from './WeekChart';
import { FollowUp } from './FollowUp';

type Period = 'week' | 'month' | '30d';
type MainTab = 'week' | 'weekdays';

const PERIODS: t.RangePreset[] = ['week', 'month', '30d'];
const TOP_ROWS = 5;
const ICON_SIZE = 16;

/**
 * The institution admin's home: this week at a glance. Headline figures follow
 * the period switch; the main card always reads the current Monday–Sunday week
 * against the one before, with the weekday pattern of the last 30 days beside it.
 */
export function Overview() {
  const localize = useLocalize();
  const { hasCapability } = useCapabilities();
  const canManage = hasCapability(SystemCapabilities.MANAGE_USERS);
  const [period, setPeriod] = useState<Period>('week');
  const [tab, setTab] = useState<MainTab>('week');
  const [inviteOpen, setInviteOpen] = useState(false);

  const today = localDay();
  const range = useMemo(() => presetRange(period), [period]);
  /** "This week" compares with the same weekdays last week, not the days just before it. */
  const previous = useMemo(
    () =>
      period === 'week'
        ? { start: addDays(range.start, -7), end: addDays(range.end, -7) }
        : previousRange(range),
    [period, range],
  );
  const week = useMemo(() => currentWeek(today), [today]);
  const lastWeek = useMemo(() => previousRange(week), [week]);
  const thirtyDays = useMemo(() => presetRange('30d'), []);

  const summary = useUsageSummary(range);
  const previousSummary = useUsageSummary(previous);
  const timeseries = useUsageTimeseries(range);
  const weekSeries = useUsageTimeseries(week);
  const lastWeekSeries = useUsageTimeseries(lastWeek);
  const monthSeries = useUsageTimeseries(thirtyDays, tab === 'weekdays');
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

  const weekly = useMemo(
    () => ({
      thisWeek: fillDaily(weekSeries.data?.points ?? [], week, (point) => point.totalTokens),
      lastWeek: fillDaily(lastWeekSeries.data?.points ?? [], lastWeek, (point) => point.totalTokens),
    }),
    [lastWeek, lastWeekSeries.data?.points, week, weekSeries.data?.points],
  );

  const loading = summary.isLoading;
  const placeholder = (value: string) => (loading ? '—' : value);
  const current = summary.data?.summary;
  const before = previousSummary.data?.summary;
  const comparedTo = localize(period === 'week' ? 'com_dash_vs_same_days_last_week' : 'com_dash_vs_previous', {
    days: series.tokens.length,
  });
  const timezone = summary.data?.range.timezone;
  const totalTokens = current?.totalTokens ?? 0;
  const topModelTokens = models.data?.models[0]?.totalTokens ?? 0;
  const topMemberTokens = members.data?.members[0]?.totalTokens ?? 0;

  const elapsed = weekly.thisWeek.filter((day) => day.day <= today).length;
  const weekSoFar = weekly.thisWeek.slice(0, elapsed).reduce((sum, day) => sum + day.value, 0);
  const lastWeekSoFar = weekly.lastWeek.slice(0, elapsed).reduce((sum, day) => sum + day.value, 0);
  const weekChange = percentChange(weekSoFar, lastWeekSoFar);

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-(--syn-bg)">
      <div className="flex w-full flex-col gap-5 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <p className="m-0 text-sm text-(--cui-color-text-muted)">
            {period === 'week'
              ? localize('com_dash_week_of', { start: formatDayLabel(range.start) })
              : localize('com_dash_range_line', {
                  start: formatDayLabel(range.start),
                  end: formatDayLabel(range.end),
                })}
            {timezone ? ` · ${timezone}` : ''}
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <RangePicker value={period} presets={PERIODS} onChange={(next) => setPeriod(next as Period)} />
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
          className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-4"
        >
          <SeatsTile seats={seats} />
          <StatTile
            label={localize('com_dash_active_users')}
            value={placeholder(formatUsageNumber(current?.memberCount ?? 0))}
            icon={<UserCheck size={ICON_SIZE} />}
            index={1}
            detail={
              <span className="flex flex-col gap-1">
                {seats?.activeMembers ? (
                  <span>
                    {localize('com_dash_active_share', {
                      share: Math.round(((current?.memberCount ?? 0) / seats.activeMembers) * 100),
                      active: formatUsageNumber(seats.activeMembers),
                    })}
                  </span>
                ) : null}
                <Delta current={current?.memberCount ?? 0} previous={before?.memberCount} suffix={comparedTo} />
              </span>
            }
          />
          <StatTile
            label={localize('com_dash_requests')}
            value={placeholder(formatUsageNumber(current?.eventCount ?? 0))}
            icon={<Activity size={ICON_SIZE} />}
            index={2}
            detail={<Delta current={current?.eventCount ?? 0} previous={before?.eventCount} suffix={comparedTo} />}
          >
            <Sparkline values={series.requests.map((datum) => datum.value)} delay={2 * TILE_STAGGER_MS} />
          </StatTile>
          <StatTile
            label={localize('com_dash_tokens_used')}
            value={placeholder(formatCompact(totalTokens))}
            icon={<Layers size={ICON_SIZE} />}
            index={3}
            detail={<Delta current={totalTokens} previous={before?.totalTokens} suffix={comparedTo} />}
          >
            <Sparkline values={series.tokens.map((datum) => datum.value)} delay={3 * TILE_STAGGER_MS} />
          </StatTile>
        </section>

        <section className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
          <section className="flex min-w-0 flex-col gap-4 rounded-xl border border-(--cui-color-stroke-default) bg-(--syn-surface) p-5 xl:col-span-2">
            <div
              role="tablist"
              aria-label={localize('com_dash_week_tabs')}
              className="-mx-1 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-(--cui-color-stroke-muted)"
            >
              <TabButton active={tab === 'week'} onClick={() => setTab('week')} controls="dash-week-panel">
                {localize('com_dash_week_tab')}
              </TabButton>
              <TabButton active={tab === 'weekdays'} onClick={() => setTab('weekdays')} controls="dash-weekdays-panel">
                <span className="sm:hidden">{localize('com_dash_weekday_short')}</span>
                <span className="hidden sm:inline">{localize('com_dash_weekday_title')}</span>
              </TabButton>
            </div>
            {tab === 'week' ? (
              <div id="dash-week-panel" role="tabpanel" className="flex flex-col gap-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[28px] leading-none font-bold tracking-tight">
                      {weekSeries.isLoading ? '—' : formatCompact(weekSoFar)}
                      <span className="ml-2 text-sm font-semibold tracking-normal text-(--cui-color-text-muted)">
                        {localize('com_dash_week_tokens_so_far')}
                      </span>
                    </span>
                    <span className="text-[13px] text-(--cui-color-text-muted)">
                      {weekChange == null
                        ? localize('com_dash_week_no_compare')
                        : localize(weekChange >= 0 ? 'com_dash_week_more' : 'com_dash_week_less', {
                            change: Math.abs(weekChange),
                          })}
                    </span>
                  </div>
                  <ul className="m-0 flex list-none gap-4 p-0 text-xs font-medium text-(--cui-color-text-muted)">
                    <li className="flex items-center gap-1.5">
                      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-xs bg-(--syn-chart-1)" />
                      {localize('com_dash_week_this')}
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 rounded-xs border border-dashed border-(--cui-color-stroke-intense)"
                      />
                      {localize('com_dash_week_last_col')}
                    </li>
                  </ul>
                </div>
                <WeekChart thisWeek={weekly.thisWeek} lastWeek={weekly.lastWeek} today={today} />
              </div>
            ) : (
              <div id="dash-weekdays-panel" role="tabpanel">
                <WeekdayUsage
                  series={fillDaily(monthSeries.data?.points ?? [], thirtyDays, (point) => point.totalTokens)}
                />
              </div>
            )}
          </section>

          <div className="flex min-w-0 flex-col gap-4">
            <MonthSoFar />
            <FollowUp canManage={canManage} />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2" title={localize('com_dash_top_members')} action={<DetailsLink />}>
            {(members.data?.members ?? []).length === 0 ? (
              <EmptyRow text={localize(members.isLoading ? 'com_ui_loading' : 'com_dash_no_usage')} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-[13px] sm:min-w-120">
                  <thead>
                    <tr className="text-xs text-(--cui-color-text-muted)">
                      <th className="py-2 font-medium">{localize('com_dash_member')}</th>
                      <th className="py-2 text-right font-medium sm:w-2/5 sm:text-left">
                        {localize('com_dash_tokens')}
                      </th>
                      <th className="hidden py-2 text-right font-medium sm:table-cell">
                        {localize('com_dash_requests')}
                      </th>
                      <th className="hidden py-2 text-right font-medium sm:table-cell">
                        {localize('com_dash_last_used')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {(members.data?.members ?? []).map((member, order) => (
                      <tr key={member.userId} className="border-t border-(--cui-color-stroke-muted)">
                        <td className="w-full max-w-0 py-2.5 pr-4">
                          <div className="truncate font-semibold">{member.name}</div>
                          <div className="truncate text-xs text-(--cui-color-text-muted)">{member.email}</div>
                        </td>
                        <td className="sm:pr-4">
                          <div className="flex items-center justify-end gap-3">
                            <ShareBar
                              value={member.totalTokens}
                              max={topMemberTokens}
                              growDelay={500 + order * BAR_STAGGER_MS}
                              className="hidden sm:block"
                            />
                            <span className="w-14 shrink-0 text-right font-semibold">
                              {formatCompact(member.totalTokens)}
                            </span>
                          </div>
                        </td>
                        <td className="hidden text-right sm:table-cell">{formatUsageNumber(member.eventCount)}</td>
                        <td className="hidden text-right text-(--cui-color-text-muted) sm:table-cell">
                          {formatRelativeTime(member.lastUsedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title={localize('com_dash_tokens_by_model')} action={<DetailsLink />}>
            {(models.data?.models ?? []).length === 0 ? (
              <EmptyRow text={localize(models.isLoading ? 'com_ui_loading' : 'com_dash_no_usage')} />
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
                      growDelay={500 + order * BAR_STAGGER_MS}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>
      <CreateUserDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  controls,
  children,
}: {
  active: boolean;
  onClick: () => void;
  controls: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={cn(
        '-mb-px min-h-10 shrink-0 cursor-pointer border-0 border-b-2 bg-transparent px-3 text-sm whitespace-nowrap',
        active
          ? 'border-(--syn-brand) font-semibold text-(--cui-color-text-default)'
          : 'border-transparent font-medium text-(--cui-color-text-muted) hover:text-(--cui-color-text-default)',
      )}
    >
      {children}
    </button>
  );
}

function MonthSoFar() {
  const localize = useLocalize();
  const month = useMemo(() => presetRange('month'), []);
  const before = useMemo(() => sameDaysLastMonth(month), [month]);
  const current = useUsageSummary(month);
  const previous = useUsageSummary(before);
  const tokens = current.data?.summary.totalTokens ?? 0;
  return (
    <Card
      title={localize('com_dash_month_title')}
      description={localize('com_dash_range_line', {
        start: formatDayLabel(month.start),
        end: formatDayLabel(month.end),
      })}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[28px] leading-none font-bold tracking-tight">
            {current.isLoading ? '—' : formatCompact(tokens)}
            <span className="ml-2 text-sm font-semibold tracking-normal text-(--cui-color-text-muted)">
              {localize('com_dash_tokens')}
            </span>
          </span>
          <Delta
            current={tokens}
            previous={previous.data?.summary.totalTokens}
            suffix={localize('com_dash_vs_same_days_last_month')}
          />
        </div>
        <span className="text-[13px] text-(--cui-color-text-muted)">
          {localize('com_dash_month_requests', {
            requests: formatUsageNumber(current.data?.summary.eventCount ?? 0),
          })}
        </span>
      </div>
    </Card>
  );
}

function SeatsTile({ seats }: { seats: t.InstitutionSeatSummary | undefined }) {
  const localize = useLocalize();
  if (!seats) {
    return <StatTile label={localize('com_dash_seats')} value="—" icon={<IdCard size={ICON_SIZE} />} index={0} />;
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
