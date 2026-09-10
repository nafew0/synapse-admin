import { useEffect, useMemo, useState } from 'react';
import { Button, Dialog } from '@clickhouse/click-ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type * as t from '@/types';
import {
  getResendableInviteCountsFn,
  listPlatformInstitutionsFn,
  resendInvitesBulkFn,
} from '@/server';
import { notifyError, notifySuccess } from '@/utils';

/**
 * Labelled by what each audience means operationally rather than by status name.
 * The Status column reports what an invitation record says; these ask whether the
 * link still works. Those disagree for an invitation that lapsed unnoticed, and
 * naming them after statuses would invite the reader to expect them to match.
 */
const AUDIENCES: Array<{ key: t.InviteAudience; label: string; hint: string }> = [
  {
    key: 'expired',
    label: 'Invitation expired',
    hint: 'The link no longer works and cannot be used to register.',
  },
  {
    key: 'pending',
    label: 'Awaiting activation',
    hint: 'Invited, link still valid, not yet used.',
  },
  { key: 'all', label: 'Both', hint: 'Everyone invited who has not joined yet.' },
];

type Step = 'choose' | 'confirm' | 'results';

export function ResendInvitesDialog({
  open,
  onClose,
  platform,
  tenantFilter,
}: t.ResendInvitesDialogProps) {
  const queryClient = useQueryClient();
  const [audience, setAudience] = useState<t.InviteAudience>('all');
  const [step, setStep] = useState<Step>('choose');
  const [tenantId, setTenantId] = useState(tenantFilter);
  const [response, setResponse] = useState<t.InviteResendResponse | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setStep('choose');
    setAudience('all');
    setResponse(null);
    setTenantId(tenantFilter);
  }, [open, tenantFilter]);

  const accountScope = tenantId === 'others' ? 'standalone' : 'institution';
  const scopedTenantId =
    platform && tenantId !== 'all' && tenantId !== 'others' ? tenantId : undefined;

  const institutionsQuery = useQuery({
    queryKey: ['platformInstitutions'],
    queryFn: () => listPlatformInstitutionsFn(),
    enabled: open && platform,
  });

  const countsQuery = useQuery({
    queryKey: ['resendableInvites', { platform, scopedTenantId, accountScope }],
    queryFn: () =>
      getResendableInviteCountsFn({
        data: { platform, tenantId: scopedTenantId, accountScope },
      }),
    enabled: open,
  });

  const counts = countsQuery.data?.counts;
  const selectedCount = counts?.[audience] ?? 0;

  const resendMutation = useMutation({
    mutationFn: () =>
      resendInvitesBulkFn({
        data: { audience, platform, tenantId: scopedTenantId, accountScope },
      }),
    onSuccess: (result) => {
      setResponse(result);
      setStep('results');
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['resendableInvites'] });
      notifySuccess(
        result.summary.sent > 0
          ? `Resent ${result.summary.sent} invitation${result.summary.sent === 1 ? '' : 's'}`
          : 'No invitations were sent',
      );
    },
    onError: (error: Error) => notifyError(error.message),
  });

  const linkRows = useMemo(
    () => (response?.results ?? []).filter((row) => row.inviteLink),
    [response],
  );

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Content title="Resend invitations" showClose>
        <div className="flex flex-col gap-4 p-1">
          {step === 'choose' && (
            <>
              {platform && (
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-(--cui-color-text-muted)">Institution</span>
                  <select
                    value={tenantId}
                    onChange={(event) => setTenantId(event.target.value)}
                    className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"
                  >
                    <option value="all">All institutions</option>
                    <option value="others">Others (standalone)</option>
                    {(institutionsQuery.data?.institutions ?? []).map((institution) => (
                      <option key={institution.tenantId} value={institution.tenantId}>
                        {institution.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <fieldset className="flex flex-col gap-2">
                <legend className="pb-1 text-sm text-(--cui-color-text-muted)">Who to resend to</legend>
                {AUDIENCES.map((option) => {
                  const count = counts?.[option.key] ?? 0;
                  const disabled = countsQuery.isLoading || count === 0;
                  return (
                    <label
                      key={option.key}
                      className={`flex items-start gap-3 rounded-lg border p-3 ${
                        audience === option.key
                          ? 'border-(--cui-color-accent-default)'
                          : 'border-(--cui-color-stroke-default)'
                      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    >
                      <input
                        type="radio"
                        name="audience"
                        className="mt-1"
                        checked={audience === option.key}
                        disabled={disabled}
                        onChange={() => setAudience(option.key)}
                      />
                      <span className="flex flex-col gap-0.5">
                        <span className="text-sm text-(--cui-color-text-default)">
                          {option.label} ({countsQuery.isLoading ? '…' : count})
                        </span>
                        <span className="text-xs text-(--cui-color-text-muted)">{option.hint}</span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            </>
          )}

          {step === 'confirm' && (
            <div className="flex flex-col gap-3 text-sm text-(--cui-color-text-default)">
              <p>
                Resend to <strong>{selectedCount}</strong> recipient
                {selectedCount === 1 ? '' : 's'}?
              </p>
              {/* Token rotation is the consequence worth surfacing: someone part-way
                  through signing up on an older link will find it stops working. */}
              <p className="text-(--cui-color-text-muted)">
                Each invitation gets a new link and a fresh expiry. Any link already sent for
                these invitations will stop working.
              </p>
            </div>
          )}

          {step === 'results' && response && (
            <div className="flex flex-col gap-3 text-sm">
              <p className="text-(--cui-color-text-default)">
                {response.summary.sent} sent · {response.summary.linkOnly} link only ·{' '}
                {response.summary.skipped} skipped · {response.summary.failed} failed
              </p>
              {response.summary.skipped > 0 && (
                <p className="text-xs text-(--cui-color-text-muted)">
                  Skipped invitations were already sent in the last few minutes.
                </p>
              )}
              {linkRows.length > 0 && (
                <div className="flex flex-col gap-2 rounded-lg border border-(--cui-color-stroke-default) p-3">
                  <p className="text-xs text-(--cui-color-text-muted)">
                    Email could not be delivered for these. Share the link directly:
                  </p>
                  {linkRows.map((row) => (
                    <div key={row.inviteId} className="flex flex-col gap-0.5">
                      <span className="text-xs text-(--cui-color-text-default)">{row.email}</span>
                      <span className="text-xs break-all text-(--cui-color-text-muted)">
                        {row.inviteLink}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {response.results.some((row) => row.outcome === 'failed') && (
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-(--cui-color-text-muted)">Failed:</p>
                  {response.results
                    .filter((row) => row.outcome === 'failed')
                    .map((row) => (
                      <span key={row.inviteId} className="text-xs text-(--cui-color-text-default)">
                        {row.email} — {row.error}
                      </span>
                    ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            {step === 'choose' && (
              <>
                <Button type="secondary" label="Cancel" onClick={onClose} />
                <Button
                  label="Continue"
                  disabled={selectedCount === 0 || countsQuery.isLoading}
                  onClick={() => setStep('confirm')}
                />
              </>
            )}
            {step === 'confirm' && (
              <>
                <Button
                  type="secondary"
                  label="Back"
                  disabled={resendMutation.isPending}
                  onClick={() => setStep('choose')}
                />
                <Button
                  label={resendMutation.isPending ? 'Sending…' : 'Resend'}
                  disabled={resendMutation.isPending}
                  onClick={() => resendMutation.mutate()}
                />
              </>
            )}
            {step === 'results' && <Button label="Done" onClick={onClose} />}
          </div>
        </div>
      </Dialog.Content>
    </Dialog>
  );
}
