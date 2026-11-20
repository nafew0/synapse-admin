import { useMutation, useQueryClient } from '@tanstack/react-query';
import type * as t from '@/types';
import {
  resendMemberVerificationFn,
  reactivateMemberFn,
  changeMemberRoleFn,
  suspendMemberFn,
} from '@/server';
import { notifyError, notifySuccess } from '@/utils';

/**
 * Every lifecycle action an admin can take on an existing member, with the
 * cache invalidation each one needs. `onClosed` runs after actions that end
 * the current view of the record (suspend, reactivate).
 */
export function useMemberActions(
  member: t.InstitutionMember | null,
  platform: boolean,
  onClosed: () => void,
) {
  const queryClient = useQueryClient();
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

  const busy = [
    suspend,
    reactivate,
    changeRole,
    resendVerification,
  ].some((mutation) => mutation.isPending);

  return {
    suspend,
    reactivate,
    changeRole,
    resendVerification,
    busy,
  };
}
