import { useCallback, useMemo, useState } from 'react';
import { Download, Plus, Send, Upload } from 'lucide-react';
import { getRouteApi } from '@tanstack/react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type * as t from '@/types';
import {
  useMemberStatusCounts,
  useDebouncedFilter,
  useCapabilities,
  useLocalize,
} from '@/hooks';
import {
  PermissionsUnavailable,
  InitialsAvatar,
  AccessDenied,
  LoadingState,
  SearchInput,
  StatusChip,
  EmptyState,
  Pagination,
  RoleChip,
  Meter,
} from '@/components/shared';
import { cn, datedFilename, downloadBlob, formatUsageNumber, notifyError } from '@/utils';
import { exportMembersFn, getMembersFn, listPlatformInstitutionsFn } from '@/server';
import { ImportMembersDialog } from './ImportMembersDialog';
import { ResendInvitesDialog } from './ResendInvitesDialog';
import { CreateUserDialog } from './CreateUserDialog';
import { SystemCapabilities } from '@/constants';
import { MemberPanel } from './MemberPanel';

const PAGE_SIZE = 25;
const Route = getRouteApi('/_app');

const STATUS_TABS: Array<{ key: t.StatusFilter; labelKey: t.TranslationKeys }> = [
  { key: 'all', labelKey: 'com_members_tab_all' },
  { key: 'active', labelKey: 'com_status_active' },
  { key: 'invited', labelKey: 'com_status_invited' },
  { key: 'expired', labelKey: 'com_status_expired' },
  { key: 'suspended', labelKey: 'com_status_suspended' },
];

const ROLE_FILTERS: Array<{ key: t.RoleFilter; labelKey: t.TranslationKeys }> = [
  { key: 'all', labelKey: 'com_members_role_all' },
  { key: 'user', labelKey: 'com_members_role_members' },
  { key: 'institution_admin', labelKey: 'com_members_role_admins' },
];

function toMemberRoleFilter(roleFilter: t.RoleFilter): t.MemberRole | 'all' {
  if (roleFilter === 'institution_admin') {
    return 'INSTITUTION_ADMIN';
  }
  if (roleFilter === 'user') {
    return 'USER';
  }
  return 'all';
}

function shortDate(value?: string | null): string {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

export function UsersPage() {
  const localize = useLocalize();
  const { user } = Route.useRouteContext();
  const {
    hasCapability,
    isLoading: capabilitiesLoading,
    isError: capabilitiesError,
  } = useCapabilities();
  const canRead = hasCapability(SystemCapabilities.READ_USERS);
  const canManage = hasCapability(SystemCapabilities.MANAGE_USERS);
  const isPlatformSuperadmin = user?.isPlatformSuperadmin === true;

  const [roleFilter, setRoleFilter] = useState<t.RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<t.StatusFilter>('all');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [page, setPage] = useState(1);
  /** The input follows every keystroke; the query key follows only the settled
   *  value, so typing a name issues one request rather than one per letter. */
  const search = useDebouncedFilter('', () => setPage(1));
  const [inviteOpen, setInviteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [resendOpen, setResendOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<t.InstitutionMember | null>(null);
  const statusCounts = useMemberStatusCounts();

  const accountScope: 'institution' | 'standalone' =
    tenantFilter === 'others' ? 'standalone' : 'institution';
  const queryInput = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      query: search.debouncedValue,
      role: toMemberRoleFilter(roleFilter),
      status: statusFilter,
      platform: isPlatformSuperadmin,
      tenantId: tenantFilter === 'all' ? undefined : tenantFilter,
      accountScope,
    }),
    [accountScope, isPlatformSuperadmin, page, roleFilter, search.debouncedValue, statusFilter, tenantFilter],
  );

  /** Exports exactly what the current filters describe, so the file and the table
   *  can never disagree about who is a member. */
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const response = await exportMembersFn({
        data: {
          query: search.debouncedValue,
          role: toMemberRoleFilter(roleFilter),
          status: statusFilter,
          /** "All institutions" and the standalone "Others" bucket both name no
           *  single tenant; scope is carried by accountScope instead. */
          tenantId:
            isPlatformSuperadmin && tenantFilter !== 'all' && tenantFilter !== 'others'
              ? tenantFilter
              : undefined,
          accountScope,
        },
      });
      downloadBlob(await response.blob(), datedFilename('members', 'xlsx'));
    } catch (error) {
      notifyError(error instanceof Error ? error.message : localize('com_members_export_failed'));
    } finally {
      setExporting(false);
    }
  }, [accountScope, isPlatformSuperadmin, localize, roleFilter, search.debouncedValue, statusFilter, tenantFilter]);

  const membersQuery = useQuery({
    queryKey: ['members', queryInput],
    queryFn: () => getMembersFn({ data: queryInput }),
    /** Keeps the current rows on screen while a new filter loads. Without it
     *  every filter change drops to the full-page loading state, which unmounts
     *  the search box mid-word and takes its focus with it. */
    placeholderData: keepPreviousData,
    enabled: canRead,
  });

  const institutionsQuery = useQuery({
    queryKey: ['platformInstitutions'],
    queryFn: () => listPlatformInstitutionsFn(),
    enabled: isPlatformSuperadmin,
  });

  if (capabilitiesLoading) {
    return null;
  }
  if (capabilitiesError) {
    return <PermissionsUnavailable />;
  }
  if (!canRead) {
    return <AccessDenied />;
  }
  if (membersQuery.isLoading || (isPlatformSuperadmin && institutionsQuery.isLoading)) {
    return <LoadingState />;
  }
  if (membersQuery.isError) {
    return (
      <EmptyState message={membersQuery.error.message || localize('com_members_load_failed')} />
    );
  }

  const data = membersQuery.data;
  if (!data) {
    return <EmptyState message={localize('com_members_none_available')} />;
  }
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  /** Prefer the row from the latest page so the panel reflects role and status changes. */
  const current = selected
    ? (data.members.find((member) => member.kind === selected.kind && member.id === selected.id) ??
      selected)
    : null;
  const columnCount = isPlatformSuperadmin ? 5 : 4;

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <div className="flex w-full flex-col gap-4 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SeatLine summary={data.summary} isPlatformSuperadmin={isPlatformSuperadmin} />
          <div className="flex flex-wrap gap-2">
            <ToolbarButton
              onClick={handleExport}
              disabled={exporting}
              icon={<Download size={16} />}
              label={localize(exporting ? 'com_members_exporting' : 'com_members_export')}
            />
            <ToolbarButton
              onClick={() => setResendOpen(true)}
              disabled={!canManage}
              icon={<Send size={16} />}
              label={localize('com_members_resend_invites')}
            />
            {!isPlatformSuperadmin ? (
              <>
                <ToolbarButton
                  onClick={() => setImportOpen(true)}
                  disabled={!canManage}
                  icon={<Upload size={16} />}
                  label={localize('com_members_import')}
                />
                <button
                  type="button"
                  onClick={() => setInviteOpen(true)}
                  disabled={!canManage}
                  className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border-0 bg-(--cui-color-accent) px-4 text-sm font-bold text-(--syn-on-accent) transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus aria-hidden="true" size={16} strokeWidth={2.4} />
                  {localize('com_users_invite_member')}
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-6">
          <section
            aria-label={localize('com_members_list')}
            className="min-w-0 flex-[999_1_36rem] overflow-hidden rounded-xl border border-(--cui-color-stroke-default) bg-(--syn-surface)"
          >
            <div
              role="tablist"
              aria-label={localize('com_members_filter_status')}
              className="flex flex-wrap gap-1 border-b border-(--cui-color-stroke-muted) px-3"
            >
              {STATUS_TABS.map((tab) => {
                const active = statusFilter === tab.key;
                const count = statusCounts[tab.key];
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setStatusFilter(tab.key);
                      setPage(1);
                    }}
                    className={cn(
                      '-mb-px flex min-h-11 cursor-pointer items-center gap-2 border-0 border-b-2 bg-transparent px-3 text-sm',
                      active
                        ? 'border-(--syn-brand) font-semibold text-(--cui-color-text-default)'
                        : 'border-transparent font-medium text-(--cui-color-text-muted) hover:text-(--cui-color-text-default)',
                    )}
                  >
                    {localize(tab.labelKey)}
                    {count != null ? (
                      <span
                        className={cn(
                          'rounded-full px-1.5 text-xs font-semibold tabular-nums',
                          active
                            ? 'bg-(--syn-brand-tint) text-(--syn-brand-ink)'
                            : 'bg-(--syn-neutral-bg) text-(--syn-neutral-fg)',
                        )}
                      >
                        {formatUsageNumber(count)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 px-4 py-3">
              <SearchInput
                value={search.value}
                onChange={search.onChange}
                placeholder={localize('com_members_search')}
                ariaLabel={localize('com_members_search')}
                className="min-w-60 flex-1"
              />
              <FilterSelect
                label={localize('com_usage_role')}
                value={roleFilter}
                onChange={(value) => {
                  setRoleFilter(value as t.RoleFilter);
                  setPage(1);
                }}
                options={ROLE_FILTERS.map((filter) => ({
                  value: filter.key,
                  label: localize(filter.labelKey),
                }))}
              />
              {isPlatformSuperadmin ? (
                <FilterSelect
                  label={localize('com_usage_institution')}
                  value={tenantFilter}
                  onChange={(value) => {
                    setTenantFilter(value);
                    setPage(1);
                  }}
                  options={[
                    { value: 'all', label: localize('com_members_all_institutions') },
                    { value: 'others', label: localize('com_members_others') },
                    ...(institutionsQuery.data?.institutions ?? []).map((institution) => ({
                      value: institution.tenantId,
                      label: institution.name,
                    })),
                  ]}
                />
              ) : null}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-160 border-collapse text-left text-[13px]">
                <thead>
                  <tr className="bg-(--syn-surface-2) text-xs text-(--cui-color-text-muted)">
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      {localize('com_dash_member')}
                    </th>
                    {isPlatformSuperadmin ? (
                      <th scope="col" className="py-2.5 pr-4 font-medium">
                        {localize('com_usage_institution')}
                      </th>
                    ) : null}
                    <th scope="col" className="py-2.5 pr-4 font-medium">
                      {localize('com_usage_role')}
                    </th>
                    <th scope="col" className="py-2.5 pr-4 font-medium">
                      {localize('com_members_status')}
                    </th>
                    <th scope="col" className="py-2.5 pr-4 font-medium">
                      {localize('com_members_joined_invited')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.members.length === 0 ? (
                    <tr>
                      <td colSpan={columnCount}>
                        <EmptyState message={localize('com_members_no_match')} />
                      </td>
                    </tr>
                  ) : (
                    data.members.map((member) => {
                      const isInvite = member.kind === 'invite';
                      const isSelected =
                        current?.kind === member.kind && current?.id === member.id;
                      return (
                        <tr
                          key={`${member.kind}-${member.id}`}
                          onClick={() => setSelected(member)}
                          className={cn(
                            'cursor-pointer border-t border-(--cui-color-stroke-muted) transition-colors',
                            isSelected
                              ? 'bg-(--syn-brand-tint)'
                              : 'hover:bg-(--cui-color-background-hover)',
                          )}
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <InitialsAvatar label={member.name || member.email} invite={isInvite} />
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  aria-pressed={isSelected}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setSelected(member);
                                  }}
                                  className="max-w-full cursor-pointer truncate border-0 bg-transparent p-0 text-left text-[13px] font-semibold text-(--cui-color-text-default)"
                                >
                                  {isInvite ? member.email : member.name || member.email}
                                </button>
                                <div className="truncate text-xs text-(--cui-color-text-muted)">
                                  {isInvite
                                    ? localize(
                                        member.inviteSource === 'csv_import'
                                          ? 'com_members_invite_csv'
                                          : 'com_members_invite_manual',
                                      )
                                    : member.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          {isPlatformSuperadmin ? (
                            <td className="pr-4">{member.institutionName || member.tenantId || '—'}</td>
                          ) : null}
                          <td className="pr-4">
                            <RoleChip role={member.role} />
                          </td>
                          <td className="pr-4">
                            <StatusChip status={member.status} />
                          </td>
                          <td className="pr-4 text-(--cui-color-text-muted)">
                            <DateCell member={member} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--cui-color-stroke-muted) px-4 py-3">
              <p className="m-0 text-[13px] text-(--cui-color-text-muted)">
                {localize('com_members_showing', {
                  shown: formatUsageNumber(data.members.length),
                  total: formatUsageNumber(data.total),
                })}
              </p>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </section>

          <MemberPanel
            member={current}
            onClose={() => setSelected(null)}
            canManage={canManage}
            platform={isPlatformSuperadmin}
          />
        </div>
      </div>

      <CreateUserDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <ImportMembersDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <ResendInvitesDialog
        open={resendOpen}
        onClose={() => setResendOpen(false)}
        platform={isPlatformSuperadmin}
        tenantFilter={tenantFilter}
      />
    </div>
  );
}

function SeatLine({
  summary,
  isPlatformSuperadmin,
}: {
  summary: t.InstitutionSeatSummary;
  isPlatformSuperadmin: boolean;
}) {
  const localize = useLocalize();
  if (isPlatformSuperadmin) {
    return (
      <p className="m-0 text-sm text-(--cui-color-text-muted)">
        {localize('com_members_platform_line', {
          users: formatUsageNumber(summary.activeMembers),
          invites: formatUsageNumber(summary.pendingInvites),
          institutions: formatUsageNumber(summary.institutions ?? 0),
        })}
      </p>
    );
  }
  const used = summary.activeMembers + summary.pendingInvites;
  const max = summary.maxActiveMembers;
  const line =
    max != null
      ? localize('com_members_seat_line', {
          used: formatUsageNumber(used),
          max: formatUsageNumber(max),
          active: formatUsageNumber(summary.activeMembers),
          invited: formatUsageNumber(summary.pendingInvites),
          free: formatUsageNumber(Math.max(max - used, 0)),
        })
      : localize('com_members_seat_line_unlimited', {
          active: formatUsageNumber(summary.activeMembers),
          invited: formatUsageNumber(summary.pendingInvites),
        });
  return (
    <div className="flex min-w-70 flex-col gap-2">
      {max != null ? (
        <Meter
          max={max}
          ariaLabel={line}
          className="w-56"
          segments={[
            { value: summary.activeMembers, color: 'var(--syn-chart-1)', label: 'active' },
            { value: summary.pendingInvites, color: 'var(--syn-chart-2)', label: 'invited' },
          ]}
        />
      ) : null}
      <span className="text-[13px] text-(--cui-color-text-default)">{line}</span>
    </div>
  );
}

function DateCell({ member }: { member: t.InstitutionMember }) {
  const localize = useLocalize();
  if (member.kind !== 'invite') {
    return <>{shortDate(member.createdAt)}</>;
  }
  if (member.status === 'expired') {
    return <>{localize('com_members_expired_on', { date: shortDate(member.expiresAt) })}</>;
  }
  return (
    <>
      {localize('com_members_sent_expires', {
        sent: shortDate(member.lastSentAt || member.createdAt),
        expires: shortDate(member.expiresAt),
      })}
    </>
  );
}

function ToolbarButton({
  onClick,
  disabled,
  icon,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-(--cui-color-stroke-default) bg-(--syn-surface) px-3.5 text-sm font-semibold text-(--cui-color-text-default) transition-colors hover:bg-(--cui-color-background-hover) disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span aria-hidden="true" className="flex">
        {icon}
      </span>
      {label}
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="flex items-center gap-2 text-[13px] font-semibold text-(--cui-color-text-muted)">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="admin-themed-control h-10 rounded-lg border border-(--cui-color-stroke-default) bg-(--syn-surface) px-2.5 text-sm font-normal text-(--cui-color-text-default)"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
