import { useMemo, useState } from 'react';
import { Clock, CircleX } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type * as t from '@/types';
import { formatRelativeTime, notifyError, notifySuccess } from '@/utils';
import { useMemberStatusCounts, useLocalize } from '@/hooks';
import { ResendInvitesDialog } from '@/components/users';
import { getMembersFn, resendInviteFn } from '@/server';
import { Card } from '@/components/shared';

const SHOWN = 4;
/** The list endpoint caps a page at 100; an institution rarely has more open invites. */
const PENDING_FETCH_LIMIT = 100;

function byExpiry(a: t.InstitutionMember, b: t.InstitutionMember): number {
  return new Date(a.expiresAt ?? 0).getTime() - new Date(b.expiresAt ?? 0).getTime();
}

/** Pending invites closest to expiring, plus the count of ones that already lapsed. */
export function FollowUp({ canManage }: { canManage: boolean }) {
  const localize = useLocalize();
  const counts = useMemberStatusCounts();
  const [resendAllOpen, setResendAllOpen] = useState(false);
  const pending = useQuery({
    queryKey: ['members', 'pending-invites'],
    queryFn: () =>
      getMembersFn({ data: { limit: PENDING_FETCH_LIMIT, offset: 0, status: 'invited' } }),
    staleTime: 60_000,
  });
  const soonest = useMemo(
    () =>
      (pending.data?.members ?? [])
        .filter((invite) => new Date(invite.expiresAt ?? 0).getTime() > Date.now())
        .sort(byExpiry)
        .slice(0, SHOWN),
    [pending.data?.members],
  );
  const expired = counts.expired ?? 0;

  return (
    <Card
      title={localize('com_dash_invites_title')}
      description={localize('com_dash_invites_desc')}
      action={
        <Link to="/users" className="text-[13px] font-semibold text-(--cui-color-text-link)">
          {localize('com_dash_all_members')}
        </Link>
      }
    >
      {soonest.length === 0 ? (
        <p className="m-0 py-4 text-center text-sm text-(--cui-color-text-muted)">
          {localize(pending.isLoading ? 'com_ui_loading' : 'com_dash_invites_none')}
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {soonest.map((invite) => (
            <InviteRow key={invite.id} invite={invite} canManage={canManage} />
          ))}
        </ul>
      )}
      {expired > 0 ? (
        <div className="mt-auto flex items-center gap-2.5 rounded-lg bg-(--syn-danger-bg) p-3 text-(--syn-danger-fg)">
          <CircleX aria-hidden="true" size={16} className="shrink-0" />
          <span className="flex-1 text-[13px] font-semibold">
            {localize('com_dash_invites_expired', { count: expired })}
          </span>
          {canManage ? (
            <button
              type="button"
              onClick={() => setResendAllOpen(true)}
              className="h-8 cursor-pointer rounded-md border border-(--syn-danger-border) bg-(--syn-surface) px-2.5 text-xs font-bold text-(--syn-danger-fg)"
            >
              {localize('com_dash_resend_all')}
            </button>
          ) : null}
        </div>
      ) : null}
      <ResendInvitesDialog
        open={resendAllOpen}
        onClose={() => setResendAllOpen(false)}
        platform={false}
        tenantFilter="all"
      />
    </Card>
  );
}

function InviteRow({ invite, canManage }: { invite: t.InstitutionMember; canManage: boolean }) {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const resend = useMutation({
    mutationFn: () => resendInviteFn({ data: { inviteId: invite.id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      notifySuccess(localize('com_dash_invite_resent', { email: invite.email }));
    },
    onError: (error: Error) => notifyError(error.message),
  });

  return (
    <li className="flex items-center gap-2.5 border-t border-(--cui-color-stroke-muted) py-2.5 first:border-t-0">
      <Clock aria-hidden="true" size={16} className="shrink-0 text-(--syn-warning-fg)" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px] font-semibold">{invite.email}</span>
        <span className="text-xs text-(--cui-color-text-muted)">
          {localize('com_dash_invite_expires', { when: formatRelativeTime(invite.expiresAt) })}
        </span>
      </div>
      {canManage ? (
        <button
          type="button"
          disabled={resend.isPending}
          onClick={() => resend.mutate()}
          aria-label={localize('com_dash_resend_to', { email: invite.email })}
          className="h-8 cursor-pointer rounded-md border border-(--cui-color-stroke-default) bg-transparent px-2.5 text-xs font-bold text-(--cui-color-text-default) hover:bg-(--cui-color-background-hover) disabled:cursor-not-allowed disabled:opacity-50"
        >
          {localize('com_dash_resend')}
        </button>
      ) : null}
    </li>
  );
}
