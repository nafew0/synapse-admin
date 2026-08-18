import { useEffect, useState } from 'react';
import { Button, Dialog } from '@clickhouse/click-ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type * as t from '@/types';
import {
  changeMemberRoleFn,
  reactivateMemberFn,
  removeMemberFn,
  resendInviteFn,
  resendMemberVerificationFn,
  revokeInviteFn,
  suspendMemberFn,
  getUserCreditsFn,
  grantCreditsFn,
} from '@/server';
import { Avatar } from '@/components/shared';
import { ConfirmDialog } from '@/components/access';
import { notifyError, notifySuccess } from '@/utils';

export function UserDetailDialog({
  member,
  onClose,
  canManage,
  platform,
}: t.UserDetailDialogProps) {
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<'revoke' | 'remove' | null>(null);
  const [resendLink, setResendLink] = useState<string | null>(null);
  const [packageId, setPackageId] = useState('');
  const credits = useQuery({
    queryKey: ['user-credits', member?.id, platform],
    queryFn: () => getUserCreditsFn({ data: { userId: member!.id, platform } }),
    enabled: !!member && member.kind === 'user',
  });
  useEffect(() => {
    setResendLink(null);
  }, [member?.id]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['members'] });
  };

  const onError = (err: Error) => notifyError(err.message);

  const resendMutation = useMutation({
    mutationFn: () =>
      resendInviteFn({
        data: { inviteId: member!.id, tenantId: member!.tenantId, platform },
      }),
    onSuccess: (result) => {
      invalidate();
      setResendLink(result.inviteLink ?? null);
      notifySuccess(
        result.inviteLink ? 'Invitation reissued — copy the new link below' : 'Invitation resent',
      );
    },
    onError,
  });

  const revokeMutation = useMutation({
    mutationFn: () =>
      revokeInviteFn({
        data: { inviteId: member!.id, tenantId: member!.tenantId, platform },
      }),
    onSuccess: () => {
      invalidate();
      notifySuccess('Invitation revoked');
      setConfirmAction(null);
      onClose();
    },
    onError,
  });

  const suspendMutation = useMutation({
    mutationFn: () =>
      suspendMemberFn({
        data: { userId: member!.id, tenantId: member!.tenantId, platform },
      }),
    onSuccess: () => {
      invalidate();
      notifySuccess('Member suspended');
      onClose();
    },
    onError,
  });

  const reactivateMutation = useMutation({
    mutationFn: () =>
      reactivateMemberFn({
        data: { userId: member!.id, tenantId: member!.tenantId, platform },
      }),
    onSuccess: () => {
      invalidate();
      notifySuccess('Member reactivated');
      onClose();
    },
    onError,
  });

  const removeMutation = useMutation({
    mutationFn: () =>
      removeMemberFn({
        data: { userId: member!.id, tenantId: member!.tenantId, platform },
      }),
    onSuccess: () => {
      invalidate();
      notifySuccess('Member removed');
      setConfirmAction(null);
      onClose();
    },
    onError,
  });

  const roleMutation = useMutation({
    mutationFn: (role: t.MemberRole) =>
      changeMemberRoleFn({
        data: {
          userId: member!.id,
          tenantId: member!.tenantId!,
          role,
          platform,
        },
      }),
    onSuccess: () => {
      invalidate();
      notifySuccess('Role updated');
    },
    onError,
  });

  const verificationMutation = useMutation({
    mutationFn: () =>
      resendMemberVerificationFn({
        data: {
          userId: member!.id,
          tenantId: member!.tenantId!,
          platform: true,
        },
      }),
    onSuccess: () => notifySuccess('Verification email resent'),
    onError,
  });

  const grantMutation = useMutation({
    mutationFn: () => grantCreditsFn({ data: { userId: member!.id, packageId, platform } }),
    onSuccess: () => {
      invalidate();
      credits.refetch();
      notifySuccess('Credits granted');
      setPackageId('');
    },
    onError,
  });

  const busy =
    resendMutation.isPending ||
    revokeMutation.isPending ||
    suspendMutation.isPending ||
    reactivateMutation.isPending ||
    removeMutation.isPending ||
    roleMutation.isPending ||
    verificationMutation.isPending ||
    grantMutation.isPending;

  return (
    <>
      <Dialog
        open={!!member}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setConfirmAction(null);
            onClose();
          }
        }}
      >
        <Dialog.Content
          title={member?.kind === 'invite' ? 'Invitation details' : 'Member details'}
          showClose
          onClose={onClose}
          className="modal-frost max-w-lg!"
        >
          {member ? (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <Avatar name={member.name || member.email} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-(--cui-color-text-default)">
                    {member.name || 'Unnamed member'}
                  </p>
                  <p className="truncate text-sm text-(--cui-color-text-muted)">{member.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 rounded-lg border border-(--cui-color-stroke-default) p-4 text-sm">
                <DetailRow label="Type" value={member.kind} />
                {platform ? (
                  <DetailRow
                    label="Institution"
                    value={member.institutionName || member.tenantId}
                  />
                ) : null}
                <DetailRow label="Role" value={member.role} />
                <DetailRow label="Status" value={member.status} />
                {member.kind === 'user' ? (
                  <DetailRow
                    label="Email verification"
                    value={member.emailVerified ? 'Verified' : 'Pending'}
                  />
                ) : null}
                <DetailRow
                  label={member.kind === 'invite' ? 'Last sent' : 'Created'}
                  value={formatDate(member.lastSentAt || member.createdAt)}
                />
                {member.expiresAt ? (
                  <DetailRow label="Expires" value={formatDate(member.expiresAt)} />
                ) : null}
              </div>

              {member.kind === 'user' && (
                <div className="rounded-lg border border-(--cui-color-stroke-default) p-4 text-sm">
                  <DetailRow
                    label="Credits"
                    value={(credits.data?.balance ?? 0).toLocaleString()}
                  />
                  {canManage && (
                    <div className="mt-3 flex gap-2">
                      <select
                        value={packageId}
                        onChange={(e) => setPackageId(e.target.value)}
                        className="min-w-0 flex-1 rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-2 py-2"
                      >
                        <option value="">Select package</option>
                        {credits.data?.packages?.list.map((pkg) => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.label}
                          </option>
                        ))}
                      </select>
                      <Button
                        label="Grant"
                        disabled={!packageId || grantMutation.isPending}
                        onClick={() => grantMutation.mutate()}
                      />
                    </div>
                  )}
                </div>
              )}

              {member.kind === 'user' ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="member-role-select"
                      className="text-sm font-medium text-(--cui-color-text-default)"
                    >
                      Role
                    </label>
                    <select
                      id="member-role-select"
                      value={member.role}
                      disabled={!canManage || busy}
                      onChange={(e) => roleMutation.mutate(e.target.value as t.MemberRole)}
                      className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"
                    >
                      <option value="USER">Member</option>
                      <option value="INSTITUTION_ADMIN">Institution admin</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {platform && member.tenantId && !member.emailVerified ? (
                      <Button
                        type="secondary"
                        label="Resend verification"
                        disabled={!canManage || busy}
                        onClick={() => verificationMutation.mutate()}
                      />
                    ) : null}
                    {member.status === 'active' ? (
                      <Button
                        type="secondary"
                        label="Suspend"
                        disabled={!canManage || busy}
                        onClick={() => suspendMutation.mutate()}
                      />
                    ) : null}
                    {member.status === 'suspended' ? (
                      <Button
                        type="secondary"
                        label="Reactivate"
                        disabled={!canManage || busy}
                        onClick={() => reactivateMutation.mutate()}
                      />
                    ) : null}

                    <Button
                      type="danger"
                      label="Remove member"
                      disabled={!canManage || busy}
                      onClick={() => setConfirmAction('remove')}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="secondary"
                      label={member.status === 'expired' ? 'Reissue invite' : 'Resend invite'}
                      disabled={!canManage || busy}
                      onClick={() => resendMutation.mutate()}
                    />
                    <Button
                      type="danger"
                      label="Revoke invite"
                      disabled={!canManage || busy || member.status === 'expired'}
                      onClick={() => setConfirmAction('revoke')}
                    />
                  </div>
                  {resendLink ? (
                    <div className="flex flex-col gap-2 rounded-lg border border-(--cui-color-stroke-default) p-3">
                      <p className="text-xs text-(--cui-color-text-muted)">
                        Email delivery is unavailable. Share this new one-time registration link:
                      </p>
                      <p className="text-xs break-all text-(--cui-color-text-default)">
                        {resendLink}
                      </p>
                      <Button
                        type="secondary"
                        label="Copy link"
                        onClick={() => {
                          navigator.clipboard.writeText(resendLink).then(
                            () => notifySuccess('Invitation link copied'),
                            () => notifyError('Could not copy the invitation link'),
                          );
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction === 'revoke' ? 'Revoke invitation' : 'Delete member account'}
        description={
          confirmAction === 'revoke'
            ? `Revoke the invitation for ${member?.email}?`
            : `Permanently delete ${member?.email} and all of their account data? Suspend keeps the account and only blocks access.`
        }
        confirmLabel={confirmAction === 'revoke' ? 'Revoke' : 'Delete permanently'}
        confirmType="danger"
        saving={busy}
        onConfirm={() => {
          if (confirmAction === 'revoke') {
            revokeMutation.mutate();
          } else if (confirmAction === 'remove') {
            removeMutation.mutate();
          }
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-(--cui-color-text-muted)">{label}</span>
      <span className="text-right text-(--cui-color-text-default)">{value || '—'}</span>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString();
}
