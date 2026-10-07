import { Button } from '@clickhouse/click-ui';
import { Network, RefreshCw } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import type * as t from '@/types';
import {
  LoadingState,
  SearchInput,
  EmptyState,
  Pagination,
  TrashButton,
  ShareBar,
} from '@/components/shared';
import { deleteGroupFn, groupsQueryOptions, GROUPS_PAGE_SIZE } from '@/server';
import { cn, notifySuccess, notifyError } from '@/utils';
import { useCapabilities, useLocalize } from '@/hooks';
import { EditGroupDialog } from './EditGroupDialog';
import { SystemCapabilities } from '@/constants';
import { ManagedGroupBadge } from './ManagedGroupBadge';
import { ConfirmDialog } from './ConfirmDialog';

export function GroupsTab({ onCreateGroup }: t.GroupsTabProps) {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const { hasCapability } = useCapabilities();
  const canManage = hasCapability(SystemCapabilities.MANAGE_GROUPS);
  const [editTarget, setEditTarget] = useState<t.AccessGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<t.AccessGroup | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  };

  const { data, isLoading, isError, isFetching } = useQuery({
    ...groupsQueryOptions(page, debouncedSearch),
    placeholderData: keepPreviousData,
  });

  const groups = data?.groups ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / GROUPS_PAGE_SIZE);
  /** The managed all-members group, when present, is the natural scale for every bar. */
  const largestGroup = groups.reduce((max, group) => Math.max(max, group.memberCount ?? 0), 0);

  const deleteMutation = useMutation({
    mutationFn: (group: t.AccessGroup) => deleteGroupFn({ data: { id: group.id } }),
    onSuccess: (_data, group) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['availableScopes'] });
      queryClient.invalidateQueries({ queryKey: ['groupAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['groupMembers'] });
      notifySuccess(localize('com_toast_group_deleted', { name: group.name }));
      setDeleteTarget(null);
      if (groups.length === 1) {
        setPage((prev) => (prev > 1 ? prev - 1 : prev));
      }
    },
    onError: (err: Error) => notifyError(err.message),
  });

  if (isLoading && !data) {
    return <LoadingState />;
  }

  if (isError && !data) {
    return (
      <div className="px-4 py-8 text-center text-sm text-(--cui-color-foreground-danger)">
        {localize('com_error_load_groups')}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-2 pr-1">
      <div className="flex items-center justify-between gap-3">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder={localize('com_access_search_groups')}
        />
        <Button
          type="secondary"
          iconLeft="plus"
          label={localize('com_access_create_group')}
          onClick={onCreateGroup}
          disabled={!canManage}
          aria-disabled={!canManage || undefined}
          title={
            !canManage
              ? localize('com_cap_no_permission', { cap: SystemCapabilities.MANAGE_GROUPS })
              : undefined
          }
        />
      </div>

      {groups.length === 0 ? (
        <EmptyState message={localize('com_access_groups_empty')} />
      ) : (
        <ul
          className={cn(
            'm-0 grid list-none grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-3 p-0',
            isFetching && 'opacity-60 transition-opacity',
          )}
        >
          {groups.map((group) => (
            <li
              key={group.id}
              className="flex flex-col gap-3 rounded-xl border border-(--cui-color-stroke-default) bg-(--syn-surface) p-4"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--syn-brand-tint) text-(--syn-brand-ink)"
                >
                  {group.managedKind ? <RefreshCw size={17} /> : <Network size={17} />}
                </span>
                <button
                  type="button"
                  onClick={() => setEditTarget(group)}
                  className="min-w-0 flex-1 cursor-pointer rounded border-0 bg-transparent p-0 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--cui-color-outline)"
                >
                  <span className="block truncate text-sm font-semibold text-(--cui-color-text-default) hover:underline">
                    {group.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-(--cui-color-text-muted)">
                    {group.description || localize('com_groups_no_description')}
                  </span>
                </button>
                {canManage && !group.managedKind && (
                  <TrashButton
                    onClick={() => setDeleteTarget(group)}
                    ariaLabel={`${localize('com_ui_delete')} ${group.name}`}
                  />
                )}
              </div>
              {group.managedKind ? <ManagedGroupBadge /> : null}
              <div className="flex items-center gap-3">
                <ShareBar value={group.memberCount ?? 0} max={largestGroup} />
                <span className="shrink-0 text-xs font-semibold text-(--cui-color-text-default) tabular-nums">
                  {localize('com_groups_member_count', { count: group.memberCount ?? 0 })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      <EditGroupDialog
        key={editTarget?.id}
        group={editTarget}
        canManage={canManage}
        onClose={() => setEditTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={localize('com_access_delete_group_title')}
        description={localize('com_access_delete_group_desc', { name: deleteTarget?.name ?? '' })}
        confirmLabel={localize('com_ui_delete')}
        saving={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
