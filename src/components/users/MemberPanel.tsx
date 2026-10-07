import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import type * as t from '@/types';
import {
  formatRelativeTime,
  formatUsageNumber,
  notifySuccess,
  formatCompact,
  notifyError,
  presetRange,
} from '@/utils';
import { InitialsAvatar, StatusChip, RoleChip, ShareBar } from '@/components/shared';
import { useMemberActions, useLocalize } from '@/hooks';
import { getUserCreditsFn, getUserUsageFn } from '@/server';
import { ConfirmDialog } from '@/components/access';

const DETAIL_RANGE = '30d';

function formatDate(value?: string | null): string {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

/** Details and actions for the member or invite selected in the members table. */
export function MemberPanel({ member, onClose, canManage, platform }: t.MemberPanelProps) {
  const localize = useLocalize();
  const [confirm, setConfirm] = useState<'revoke' | 'remove' | null>(null);
  const actions = useMemberActions(member, platform, onClose);
  const { clearResendLink } = actions;

  useEffect(() => {
    setConfirm(null);
    clearResendLink();
  }, [clearResendLink, member?.id]);

  if (!member) {
    return (
      <aside
        aria-label={localize('com_members_panel')}
        className="flex min-h-60 flex-[1_1_20rem] items-center justify-center rounded-xl border border-dashed border-(--cui-color-stroke-default) p-6 text-center text-sm text-(--cui-color-text-muted)"
      >
        {localize('com_members_panel_empty')}
      </aside>
    );
  }

  const isInvite = member.kind === 'invite';

  return (
    <aside
      aria-label={localize('com_members_panel')}
      className="flex max-w-full flex-[1_1_20rem] flex-col gap-4 self-start rounded-xl border border-(--cui-color-stroke-default) bg-(--syn-surface) p-5"
    >
      <div className="flex items-start gap-3">
        <InitialsAvatar label={member.name || member.email} invite={isInvite} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-lg font-bold">
            {isInvite ? localize('com_members_pending_invite') : member.name || member.email}
          </span>
          <span className="truncate text-[13px] text-(--cui-color-text-muted)">{member.email}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={localize('com_members_close_panel')}
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-(--cui-color-text-muted) hover:bg-(--cui-color-background-hover)"
        >
          <X aria-hidden="true" size={16} />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <StatusChip status={member.status} />
        <RoleChip role={member.role} />
        {!isInvite ? (
          <span className="rounded-md bg-(--syn-neutral-bg) px-2 py-0.5 text-xs font-semibold text-(--syn-neutral-fg)">
            {localize(member.emailVerified ? 'com_members_verified' : 'com_members_unverified')}
          </span>
        ) : null}
      </div>

      {isInvite ? (
        <InviteDetails member={member} />
      ) : (
        <UserDetails member={member} platform={platform} canManage={canManage} actions={actions} />
      )}

      {canManage ? (
        <div className="flex flex-wrap gap-2 border-t border-(--cui-color-stroke-muted) pt-4">
          {isInvite ? (
            <>
              <PanelButton
                tone="brand"
                disabled={actions.busy}
                onClick={() => actions.resend.mutate()}
              >
                {localize(member.status === 'expired' ? 'com_members_reissue' : 'com_members_resend')}
              </PanelButton>
              <PanelButton
                tone="danger"
                disabled={actions.busy || member.status === 'expired'}
                onClick={() => setConfirm('revoke')}
              >
                {localize('com_members_revoke')}
              </PanelButton>
            </>
          ) : (
            <>
              {member.status === 'active' ? (
                <PanelButton disabled={actions.busy} onClick={() => actions.suspend.mutate()}>
                  {localize('com_members_suspend')}
                </PanelButton>
              ) : null}
              {member.status === 'suspended' ? (
                <PanelButton disabled={actions.busy} onClick={() => actions.reactivate.mutate()}>
                  {localize('com_members_reactivate')}
                </PanelButton>
              ) : null}
              <PanelButton tone="danger" disabled={actions.busy} onClick={() => setConfirm('remove')}>
                {localize('com_members_remove')}
              </PanelButton>
            </>
          )}
        </div>
      ) : null}

      {actions.resendLink ? (
        <div className="flex flex-col gap-2 rounded-lg border border-(--cui-color-stroke-default) p-3">
          <p className="m-0 text-xs text-(--cui-color-text-muted)">{localize('com_members_link_fallback')}</p>
          <p className="m-0 text-xs break-all">{actions.resendLink}</p>
          <PanelButton
            onClick={() => {
              navigator.clipboard.writeText(actions.resendLink ?? '').then(
                () => notifySuccess(localize('com_members_link_copied')),
                () => notifyError(localize('com_members_link_copy_failed')),
              );
            }}
          >
            {localize('com_members_copy_link')}
          </PanelButton>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirm != null}
        title={localize(confirm === 'revoke' ? 'com_members_revoke_title' : 'com_members_remove_title')}
        description={localize(
          confirm === 'revoke' ? 'com_members_revoke_desc' : 'com_members_remove_desc',
          { email: member.email },
        )}
        confirmLabel={localize(confirm === 'revoke' ? 'com_members_revoke' : 'com_members_remove_confirm')}
        confirmType="danger"
        saving={actions.busy}
        onConfirm={() => (confirm === 'revoke' ? actions.revoke.mutate() : actions.remove.mutate())}
        onCancel={() => setConfirm(null)}
      />
    </aside>
  );
}

function InviteDetails({ member }: { member: t.InstitutionMember }) {
  const localize = useLocalize();
  return (
    <>
      <DetailList
        rows={[
          [
            localize('com_members_invited_via'),
            localize(member.inviteSource === 'csv_import' ? 'com_members_source_csv' : 'com_members_source_manual'),
          ],
          [localize('com_members_last_sent'), formatDateTime(member.lastSentAt || member.createdAt)],
          [localize('com_members_expires'), formatDateTime(member.expiresAt)],
        ]}
      />
      {member.status === 'invited' ? (
        <p className="m-0 rounded-lg bg-(--syn-warning-bg) p-3 text-[13px] text-(--syn-warning-fg)">
          {localize('com_members_invite_seat_note')}
        </p>
      ) : null}
    </>
  );
}

function UserDetails({
  member,
  platform,
  canManage,
  actions,
}: {
  member: t.InstitutionMember;
  platform: boolean;
  canManage: boolean;
  actions: ReturnType<typeof useMemberActions>;
}) {
  const localize = useLocalize();
  const [packageId, setPackageId] = useState('');
  const range = useMemo(() => presetRange(DETAIL_RANGE), []);
  const usage = useQuery({
    queryKey: ['user-usage', member.id, platform, range],
    queryFn: () => getUserUsageFn({ data: { userId: member.id, platform, ...range } }),
  });
  const credits = useQuery({
    queryKey: ['user-credits', member.id, platform],
    queryFn: () => getUserCreditsFn({ data: { userId: member.id, platform } }),
  });

  const models = usage.data?.models ?? [];
  const topModel = models[0]?.totalTokens ?? 0;
  const packages = credits.data?.packages?.list ?? [];
  const latestGrant = credits.data?.grants[0];
  const latestPackage = packages.find((pkg) => pkg.id === latestGrant?.packageId);

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Figure label={localize('com_members_tokens_30d')} value={formatCompact(usage.data?.summary.totalTokens ?? 0)} />
        <Figure label={localize('com_usage_requests')} value={formatUsageNumber(usage.data?.summary.eventCount ?? 0)} />
        <Figure label={localize('com_members_credits')} value={formatUsageNumber(credits.data?.balance ?? 0)} />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex justify-between gap-2 text-[13px]">
          <span className="font-bold">{localize('com_members_by_model')}</span>
          <span className="text-(--cui-color-text-muted)">
            {usage.data?.summary.lastUsedAt
              ? localize('com_members_last_used', { when: formatRelativeTime(usage.data.summary.lastUsedAt) })
              : localize('com_members_never_used')}
          </span>
        </div>
        {models.length === 0 ? (
          <span className="text-xs text-(--cui-color-text-muted)">{localize('com_dash_no_usage')}</span>
        ) : (
          models.slice(0, 5).map((model) => (
            <div key={model.modelKey} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-2.5 text-xs">
              <span className="truncate font-semibold">{model.displayName ?? model.modelKey}</span>
              <ShareBar value={model.totalTokens} max={topModel} className="h-2" />
              <span className="text-right font-semibold tabular-nums">{formatCompact(model.totalTokens)}</span>
            </div>
          ))
        )}
      </div>

      <DetailList
        rows={[
          ...(platform ? [[localize('com_usage_institution'), member.institutionName || member.tenantId || '—'] as [string, string]] : []),
          [localize('com_members_joined'), formatDate(member.createdAt)],
          [localize('com_members_sign_in'), member.provider || '—'],
          [
            localize('com_members_latest_credits'),
            latestGrant
              ? `+${formatUsageNumber(latestGrant.credits)} · ${formatDate(latestGrant.createdAt)}${latestPackage ? ` · ${latestPackage.label}` : ''}`
              : '—',
          ],
        ]}
      />

      {canManage ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            {localize('com_usage_role')}
            <select
              value={member.role === 'INSTITUTION_ADMIN' ? 'INSTITUTION_ADMIN' : 'USER'}
              disabled={actions.busy}
              onChange={(event) => actions.changeRole.mutate(event.target.value as t.MemberRole)}
              className="admin-themed-control h-10 rounded-lg border border-(--cui-color-stroke-default) bg-(--syn-surface) px-2.5 text-sm font-normal text-(--cui-color-text-default)"
            >
              <option value="USER">{localize('com_role_member')}</option>
              <option value="INSTITUTION_ADMIN">{localize('com_members_role_institution_admin')}</option>
            </select>
          </label>
          <div className="flex flex-col gap-1.5 text-[13px] font-semibold">
            <label htmlFor={`grant-${member.id}`}>{localize('com_members_grant_credits')}</label>
            <div className="flex gap-2">
              <select
                id={`grant-${member.id}`}
                value={packageId}
                onChange={(event) => setPackageId(event.target.value)}
                className="admin-themed-control h-10 min-w-0 flex-1 rounded-lg border border-(--cui-color-stroke-default) bg-(--syn-surface) px-2.5 text-sm font-normal text-(--cui-color-text-default)"
              >
                <option value="">{localize('com_members_select_package')}</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.label}
                  </option>
                ))}
              </select>
              <PanelButton
                disabled={!packageId || actions.busy}
                onClick={() => actions.grantCredits.mutate(packageId, { onSuccess: () => setPackageId('') })}
              >
                {localize('com_members_grant')}
              </PanelButton>
            </div>
          </div>
          {platform && member.tenantId && !member.emailVerified ? (
            <PanelButton disabled={actions.busy} onClick={() => actions.resendVerification.mutate()}>
              {localize('com_members_resend_verification')}
            </PanelButton>
          ) : null}
        </div>
      ) : null}

      <Link
        to="/users/$userId"
        params={{ userId: member.id }}
        className="text-[13px] font-semibold text-(--cui-color-text-link)"
      >
        {localize('com_members_full_usage')}
      </Link>
    </>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-(--syn-surface-2) px-3 py-2.5">
      <div className="text-[11px] font-medium text-(--cui-color-text-muted)">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function DetailList({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="m-0 grid grid-cols-[7rem_1fr] gap-y-2 text-[13px]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-(--cui-color-text-muted)">{label}</dt>
          <dd className="m-0 wrap-break-word">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PanelButton({
  children,
  onClick,
  disabled,
  tone = 'default',
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'brand' | 'danger';
}) {
  const toneClass = {
    default: 'border border-(--cui-color-stroke-default) bg-transparent text-(--cui-color-text-default) hover:bg-(--cui-color-background-hover)',
    brand: 'border-0 bg-(--syn-brand) text-(--syn-on-brand) hover:brightness-95',
    danger: 'border border-(--syn-danger-border) bg-transparent text-(--syn-danger-fg) hover:bg-(--syn-danger-bg)',
  }[tone];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`h-10 flex-1 cursor-pointer rounded-lg px-3 text-[13px] font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
    >
      {children}
    </button>
  );
}
