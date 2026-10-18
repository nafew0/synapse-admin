import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type * as t from '@/types';
import {
  resendMemberVerificationFn,
  reactivateMemberFn,
  changeMemberRoleFn,
  suspendMemberFn,
  removeMemberFn,
  resendInviteFn,
  revokeInviteFn,
} from '@/server';
import { notifyError, notifySuccess } from '@/utils';

/**
 * Every lifecycle action an admin can take on a member or an invite, with the
 * cache invalidation each one needs. `onClosed` runs after actions that end
 * the current view of the record (suspend, reactivate, remove, revoke).
 */
export function useMemberActions(
  member: t.InstitutionMember | null,
  platform: boolean,
  onClosed: () => void,
) {
  const queryClient = useQueryClient();
  const [resendLink, setResendLink] = useState<string | null>(null);
  const target = { tenantId: member?.tenantId, platform };
  const onError = (error: Error) => notifyError(error.message);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['members'] });
    if (!member) {
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['user-detail', member.id] });
    queryClient.invalidateQueries({ queryKey: ['user-usage', member.id] });
  };

  const finish = (message: string) => () => {
    refresh();
    notifySuccess(message);
    onClosed();
  };

  const resend = useMutation({
    mutationFn: () => resendInviteFn({ data: { inviteId: member!.id, ...target } }),
    onSuccess: (result) => {
      refresh();
      setResendLink(result.inviteLink ?? null);
      notifySuccess(
        result.inviteLink ? 'Invitation reissued — copy the new link below' : 'Invitation resent',
      );
    },
    onError,
  });
  const revoke = useMutation({
    mutationFn: () => revokeInviteFn({ data: { inviteId: member!.id, ...target } }),
    onSuccess: finish('Invitation revoked'),
    onError,
  });
  const suspend = useMutation({
    mutationFn: () => suspendMemberFn({ data: { userId: member!.id, ...target } }),
    onSuccess: finish('Member suspended'),
    onError,
  });
  const reactivate = useMutation({
    mutationFn: () => reactivateMemberFn({ data: { userId: member!.id, ...target } }),
    onSuccess: finish('Member reactivated'),
    onError,
  });
  const remove = useMutation({
    mutationFn: () => removeMemberFn({ data: { userId: member!.id, ...target } }),
    onSuccess: finish('Member removed'),
    onError,
  });
  const changeRole = useMutation({
    mutationFn: (role: t.MemberRole) =>
      changeMemberRoleFn({
        data: { userId: member!.id, tenantId: member!.tenantId!, role, platform },
      }),
    onSuccess: () => {
      refresh();
      notifySuccess('Role updated');
    },
    onError,
  });
  const resendVerification = useMutation({
    mutationFn: () =>
      resendMemberVerificationFn({
        data: { userId: member!.id, tenantId: member!.tenantId!, platform: true },
      }),
    onSuccess: () => notifySuccess('Verification email resent'),
    onError,
  });

  const clearResendLink = useCallback(() => setResendLink(null), []);

  const busy = [
    resend,
    revoke,
    suspend,
    reactivate,
    remove,
    changeRole,
    resendVerification,
  ].some((mutation) => mutation.isPending);

  return {
    resend,
    revoke,
    suspend,
    reactivate,
    remove,
    changeRole,
    resendVerification,
    resendLink,
    clearResendLink,
    busy,
  };
}
