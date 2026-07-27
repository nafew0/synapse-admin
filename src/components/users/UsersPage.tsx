import { useMemo, useState } from 'react';
import { Icon } from '@clickhouse/click-ui';
import { getRouteApi } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import type * as t from '@/types';
import { SystemCapabilities } from '@/constants';
import { useCapabilities } from '@/hooks';
import { cn } from '@/utils';
import { getMembersFn, listPlatformInstitutionsFn } from '@/server';
import {
  AccessDenied,
  EmptyState,
  LoadingState,
  Pagination,
  PermissionsUnavailable,
  SearchInput,
} from '@/components/shared';
import { CreateUserDialog } from './CreateUserDialog';
import { ImportMembersDialog } from './ImportMembersDialog';
import { UserDetailDialog } from './UserDetailDialog';

const PAGE_SIZE = 25;
const Route = getRouteApi('/_app');

const ROLE_FILTERS: Array<{ key: t.RoleFilter; label: string }> = [
  { key: 'all', label: 'All roles' },
  { key: 'user', label: 'Members' },
  { key: 'institution_admin', label: 'Institution admins' },
];

const STATUS_FILTERS: Array<{ key: t.StatusFilter; label: string }> = [
  { key: 'all', label: 'All statuses' },
  { key: 'active', label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'invited', label: 'Invited' },
  { key: 'expired', label: 'Expired invites' },
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

export function UsersPage() {
  const { user } = Route.useRouteContext();
  const {
    hasCapability,
    isLoading: capabilitiesLoading,
    isError: capabilitiesError,
  } = useCapabilities();
  const canRead = hasCapability(SystemCapabilities.READ_USERS);
  const canManage = hasCapability(SystemCapabilities.MANAGE_USERS);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<t.RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<t.StatusFilter>('all');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<t.InstitutionMember | null>(null);
  const isPlatformSuperadmin = user?.isPlatformSuperadmin === true;

  const queryInput = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      query: search,
      role: toMemberRoleFilter(roleFilter),
      status: statusFilter,
      platform: isPlatformSuperadmin,
      tenantId: tenantFilter === 'all' ? undefined : tenantFilter,
    }),
    [isPlatformSuperadmin, page, roleFilter, search, statusFilter, tenantFilter],
  );

  const membersQuery = useQuery({
    queryKey: ['members', queryInput],
    queryFn: () => getMembersFn({ data: queryInput }),
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
      <EmptyState message={membersQuery.error.message || 'Failed to load institution members.'} />
    );
  }

  const data = membersQuery.data;
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-auto p-6">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SummaryCard
          label={isPlatformSuperadmin ? 'Active users' : 'Active seats'}
          value={`${data.summary.activeMembers}`}
          detail={
            data.summary.maxActiveMembers != null
              ? `of ${data.summary.maxActiveMembers}`
              : 'Unlimited plan'
          }
        />
        <SummaryCard label="Pending invites" value={`${data.summary.pendingInvites}`} />
        <SummaryCard
          label={isPlatformSuperadmin ? 'Institutions' : 'Visible results'}
          value={`${isPlatformSuperadmin ? (data.summary.institutions ?? 0) : data.total}`}
          detail={isPlatformSuperadmin ? 'Current institution scope' : 'Current filter set'}
        />
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search members"
          className="min-w-70 flex-1"
        />

        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value as t.RoleFilter);
            setPage(1);
          }}
          className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"
        >
          {ROLE_FILTERS.map((filter) => (
            <option key={filter.key} value={filter.key}>
              {filter.label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as t.StatusFilter);
            setPage(1);
          }}
          className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"
        >
          {STATUS_FILTERS.map((filter) => (
            <option key={filter.key} value={filter.key}>
              {filter.label}
            </option>
          ))}
        </select>

        {isPlatformSuperadmin ? (
          <select
            value={tenantFilter}
            onChange={(e) => {
              setTenantFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"
          >
            <option value="all">All institutions</option>
            {(institutionsQuery.data?.institutions ?? []).map((institution) => (
              <option key={institution.tenantId} value={institution.tenantId}>
                {institution.name}
              </option>
            ))}
          </select>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              disabled={!canManage}
              className="flex items-center gap-1.5 rounded-lg border border-(--cui-color-stroke-default) px-3 py-2 text-sm text-(--cui-color-text-default) transition-colors hover:bg-(--cui-color-background-hover) disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="upload" size="xs" />
              Import CSV
            </button>

            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              disabled={!canManage}
              className="flex items-center gap-1.5 rounded-lg border border-(--cui-color-stroke-default) px-3 py-2 text-sm text-(--cui-color-text-default) transition-colors hover:bg-(--cui-color-background-hover) disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="plus" size="xs" />
              Invite member
            </button>
          </>
        )}
      </section>

      <section className="overflow-hidden rounded-lg border border-(--cui-color-stroke-default)">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-(--cui-color-stroke-default) bg-(--cui-color-background-muted)">
              <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">Member</th>
              {isPlatformSuperadmin ? (
                <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                  Institution
                </th>
              ) : null}
              <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">Role</th>
              <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">Status</th>
              <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                Added / Sent
              </th>
            </tr>
          </thead>
          <tbody>
            {data.members.length === 0 ? (
              <tr>
                <td colSpan={isPlatformSuperadmin ? 5 : 4}>
                  <EmptyState message="No members match the current filters." />
                </td>
              </tr>
            ) : (
              data.members.map((member, index) => (
                <tr
                  key={`${member.kind}-${member.id}`}
                  className={cn(
                    'cursor-pointer bg-(--cui-color-background-panel) transition-colors hover:bg-(--cui-color-background-hover)',
                    index < data.members.length - 1 &&
                      'border-b border-(--cui-color-stroke-default)',
                  )}
                  onClick={() => setSelectedMember(member)}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-(--cui-color-text-default)">
                        {member.name || 'Unnamed member'}
                      </span>
                      <span className="text-xs text-(--cui-color-text-muted)">{member.email}</span>
                    </div>
                  </td>
                  {isPlatformSuperadmin ? (
                    <td className="px-4 py-3 text-(--cui-color-text-default)">
                      {member.institutionName || member.tenantId}
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-(--cui-color-background-secondary) px-2 py-0.5 text-xs text-(--cui-color-text-default)">
                      {member.role === 'INSTITUTION_ADMIN' ? 'Institution admin' : 'Member'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusBadgeClass(member.status)}>{member.status}</span>
                  </td>
                  <td className="px-4 py-3 text-(--cui-color-text-muted)">
                    {new Date(
                      member.lastSentAt || member.createdAt || Date.now(),
                    ).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-(--cui-color-text-muted)">
          Showing {data.members.length} of {data.total} members
        </p>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <CreateUserDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <ImportMembersDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <UserDetailDialog
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
        canManage={canManage}
        platform={isPlatformSuperadmin}
      />
    </div>
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

function statusBadgeClass(status: t.MemberStatus) {
  if (status === 'active') {
    return 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400';
  }
  if (status === 'suspended') {
    return 'rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400';
  }
  if (status === 'invited') {
    return 'rounded-full bg-sky-500/15 px-2 py-0.5 text-xs text-sky-400';
  }
  return 'rounded-full bg-rose-500/15 px-2 py-0.5 text-xs text-rose-400';
}
