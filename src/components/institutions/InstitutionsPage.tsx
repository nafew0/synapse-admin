import { useState, type ReactNode } from 'react';
import { Button, Icon } from '@clickhouse/click-ui';
import { Link, getRouteApi } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type * as t from '@/types';
import {
  listPlatformInstitutionsFn,
  createPlatformInstitutionFn,
  assignPlatformInstitutionAdminFn,
  suspendPlatformInstitutionFn,
  reactivatePlatformInstitutionFn,
} from '@/server';
import { EmptyState, FormDialog, LoadingState, SearchInput } from '@/components/shared';
import { notifyError, notifySuccess } from '@/utils';

const Route = getRouteApi('/_app');

export function InstitutionsPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<t.PlatformInstitution | null>(null);
  const [lifecycleTarget, setLifecycleTarget] = useState<t.PlatformInstitution | null>(null);
  const [offset, setOffset] = useState(0);

  const institutionsQuery = useQuery({
    queryKey: ['platformInstitutions', search, offset],
    queryFn: () =>
      listPlatformInstitutionsFn({
        data: { q: search.trim() || undefined, limit: 25, offset },
      }),
  });

  const lifecycleMutation = useMutation({
    mutationFn: (institution: t.PlatformInstitution) =>
      institution.status === 'suspended'
        ? reactivatePlatformInstitutionFn({ data: { tenantId: institution.tenantId } })
        : suspendPlatformInstitutionFn({ data: { tenantId: institution.tenantId } }),
    onSuccess: (_result, institution) => {
      notifySuccess(
        institution.status === 'suspended'
          ? `${institution.name} reactivated`
          : `${institution.name} suspended`,
      );
      queryClient.invalidateQueries({ queryKey: ['platformInstitutions'] });
      queryClient.invalidateQueries({ queryKey: ['platformInstitution', institution.tenantId] });
      setLifecycleTarget(null);
    },
    onError: (error: Error) => notifyError(error.message),
  });

  const filtered = institutionsQuery.data?.institutions ?? [];

  if (!user?.isPlatformSuperadmin) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState message="Platform superadmin access is required for institution management." />
      </div>
    );
  }

  if (institutionsQuery.isLoading) {
    return <LoadingState />;
  }

  if (institutionsQuery.isError) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState message={institutionsQuery.error.message || 'Failed to load institutions.'} />
      </div>
    );
  }

  const institutions = institutionsQuery.data?.institutions ?? [];

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-auto p-6">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SummaryCard label="Institutions" value={String(institutionsQuery.data?.total ?? 0)} />
        <SummaryCard
          label="Active institutions"
          value={String(
            institutions.filter((institution) => institution.status === 'active').length,
          )}
        />
        <SummaryCard
          label="Configured seat caps"
          value={String(
            institutions.filter((institution) => institution.limits?.maxActiveMembers != null)
              .length,
          )}
        />
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setOffset(0);
          }}
          placeholder="Search institutions"
          className="min-w-70 flex-1"
        />

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-(--cui-color-stroke-default) px-3 py-2 text-sm text-(--cui-color-text-default) transition-colors hover:bg-(--cui-color-background-hover)"
        >
          <Icon name="plus" size="xs" />
          Create institution
        </button>
      </section>

      <section className="overflow-hidden rounded-lg border border-(--cui-color-stroke-default)">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-(--cui-color-stroke-default) bg-(--cui-color-background-muted)">
              <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">Institution</th>
              <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">Tenant ID</th>
              <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">Seats</th>
              <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">Status</th>
              <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState message="No institutions match the current filter." />
                </td>
              </tr>
            ) : (
              filtered.map((institution, index) => (
                <tr
                  key={institution._id || institution.id || institution.tenantId}
                  className={
                    index < filtered.length - 1
                      ? 'border-b border-(--cui-color-stroke-default)'
                      : undefined
                  }
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-(--cui-color-text-default)">
                        {institution.name}
                      </span>
                      <span className="text-xs text-(--cui-color-text-muted)">
                        {institution.slug || 'No slug configured'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-(--cui-color-text-default)">
                    {institution.tenantId}
                  </td>
                  <td className="px-4 py-3 text-(--cui-color-text-default)">
                    {institution.limits?.maxActiveMembers != null
                      ? `${institution.stats?.activeMembers ?? 0} / ${institution.limits.maxActiveMembers}`
                      : `${institution.stats?.activeMembers ?? 0} / unlimited`}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={institution.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        to="/institutions/$tenantId"
                        params={{ tenantId: institution.tenantId }}
                        className="rounded-lg border border-(--cui-color-stroke-default) px-3 py-2 text-xs text-(--cui-color-text-default) hover:bg-(--cui-color-background-hover)"
                      >
                        Open
                      </Link>
                      <Button
                        type="secondary"
                        label="Invite admin"
                        onClick={() => setAssignTarget(institution)}
                      />
                      <Button
                        type="secondary"
                        label={institution.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                        disabled={lifecycleMutation.isPending}
                        onClick={() => setLifecycleTarget(institution)}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="secondary"
          label="Previous"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(offset - 25, 0))}
        />
        <span className="text-xs text-(--cui-color-text-muted)">
          {offset + 1}–{Math.min(offset + institutions.length, institutionsQuery.data?.total ?? 0)}{' '}
          of {institutionsQuery.data?.total ?? 0}
        </span>
        <Button
          type="secondary"
          label="Next"
          disabled={offset + institutions.length >= (institutionsQuery.data?.total ?? 0)}
          onClick={() => setOffset(offset + 25)}
        />
      </div>

      <CreateInstitutionDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['platformInstitutions'] });
        }}
      />

      <AssignInstitutionAdminDialog
        institution={assignTarget}
        onClose={() => setAssignTarget(null)}
        onAssigned={() => {
          queryClient.invalidateQueries({ queryKey: ['platformInstitutions'] });
        }}
      />

      <FormDialog
        open={lifecycleTarget != null}
        title={
          lifecycleTarget?.status === 'suspended' ? 'Reactivate institution' : 'Suspend institution'
        }
        submitLabel={lifecycleTarget?.status === 'suspended' ? 'Reactivate' : 'Suspend'}
        saving={lifecycleMutation.isPending}
        onSubmit={() => {
          if (lifecycleTarget) {
            lifecycleMutation.mutate(lifecycleTarget);
          }
        }}
        onClose={() => setLifecycleTarget(null)}
      >
        <p className="text-sm text-(--cui-color-text-default)">
          {lifecycleTarget?.status === 'suspended'
            ? `Restore access for every member of ${lifecycleTarget?.name}?`
            : `Suspending ${lifecycleTarget?.name} blocks every member of the institution from using Synapse until it is reactivated. Usage already recorded is kept.`}
        </p>
      </FormDialog>
    </div>
  );
}

function StatusPill({ status }: { status: t.PlatformInstitution['status'] }) {
  const suspended = status === 'suspended';
  return (
    <span
      className={
        suspended
          ? 'rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400'
          : 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400'
      }
    >
      {status}
    </span>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-panel) p-4">
      <p className="text-xs text-(--cui-color-text-muted)">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-(--cui-color-text-default)">{value}</p>
    </div>
  );
}

function CreateInstitutionDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [tenantId, setTenantId] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [maxActiveMembers, setMaxActiveMembers] = useState('');
  const [error, setError] = useState('');
  const [bootstrapLink, setBootstrapLink] = useState<string | null>(null);

  const resetAndClose = () => {
    setTenantId('');
    setName('');
    setSlug('');
    setAdminEmail('');
    setAdminName('');
    setMaxActiveMembers('');
    setError('');
    setBootstrapLink(null);
    onClose();
  };

  const mutation = useMutation({
    mutationFn: () =>
      createPlatformInstitutionFn({
        data: {
          tenantId,
          name,
          slug: slug || undefined,
          adminEmail: adminEmail.trim(),
          adminName: adminName || undefined,
          maxActiveMembers: maxActiveMembers ? Number(maxActiveMembers) : null,
        },
      }),
    onSuccess: (result) => {
      onCreated();
      if (result.inviteLink) {
        setBootstrapLink(result.inviteLink);
        notifySuccess('Institution created and admin invitation generated');
        return;
      }
      notifySuccess(
        result.invite ? 'Institution created and admin invitation emailed' : 'Institution created',
      );
      resetAndClose();
    },
    onError: (err: Error) => notifyError(err.message),
  });

  const onSubmit = () => {
    if (bootstrapLink) {
      resetAndClose();
      return;
    }
    setError('');
    if (!tenantId.trim() || !name.trim() || !adminEmail.trim()) {
      setError('Institution name, tenant ID, and initial admin email are required');
      return;
    }
    if (maxActiveMembers && Number(maxActiveMembers) <= 0) {
      setError('Seat limit must be a positive number');
      return;
    }
    mutation.mutate();
  };

  return (
    <FormDialog
      open={open}
      title="Create institution"
      submitLabel={bootstrapLink ? 'Done' : 'Create institution and invite admin'}
      submitDisabled={!bootstrapLink && (!tenantId.trim() || !name.trim() || !adminEmail.trim())}
      saving={mutation.isPending}
      error={error}
      size="lg"
      onSubmit={onSubmit}
      onClose={resetAndClose}
    >
      {bootstrapLink ? (
        <InviteLinkPanel
          email={adminEmail}
          inviteLink={bootstrapLink}
          message="The institution was created. Email delivery is not configured, so send this one-time registration link to the initial institution admin."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Institution name" htmlFor="institution-name">
            <input
              id="institution-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Example University"
              autoFocus
              className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"
            />
          </Field>

          <Field label="Tenant ID" htmlFor="institution-tenant-id">
            <input
              id="institution-tenant-id"
              type="text"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="example-university"
              className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"
            />
          </Field>

          <Field label="Slug" htmlFor="institution-slug">
            <input
              id="institution-slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="example-university"
              className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"
            />
          </Field>

          <Field label="Seat limit" htmlFor="institution-seat-limit">
            <input
              id="institution-seat-limit"
              type="number"
              min="1"
              value={maxActiveMembers}
              onChange={(e) => setMaxActiveMembers(e.target.value)}
              placeholder="Leave blank for unlimited"
              className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"
            />
          </Field>

          <Field label="Initial institution admin email" htmlFor="institution-admin-email">
            <input
              id="institution-admin-email"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@example.edu"
              className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"
            />
            <p className="text-xs text-(--cui-color-text-muted)">
              Required. A new email receives an invitation; an existing member of this institution
              is promoted.
            </p>
          </Field>

          <Field label="Institution admin name" htmlFor="institution-admin-name">
            <input
              id="institution-admin-name"
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Admin name"
              className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"
            />
          </Field>
        </div>
      )}
    </FormDialog>
  );
}

function AssignInstitutionAdminDialog({
  institution,
  onClose,
  onAssigned,
}: {
  institution: t.PlatformInstitution | null;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const resetAndClose = () => {
    setEmail('');
    setName('');
    setError('');
    setInviteLink(null);
    onClose();
  };

  const mutation = useMutation({
    mutationFn: () =>
      assignPlatformInstitutionAdminFn({
        data: {
          tenantId: institution!.tenantId,
          email,
          name: name || undefined,
        },
      }),
    onSuccess: (result) => {
      onAssigned();
      if (result.inviteLink) {
        setInviteLink(result.inviteLink);
        notifySuccess('Institution admin invitation generated');
        return;
      }
      notifySuccess(
        result.invite ? 'Institution admin invitation emailed' : 'Institution admin assigned',
      );
      resetAndClose();
    },
    onError: (err: Error) => notifyError(err.message),
  });

  const onSubmit = () => {
    if (inviteLink) {
      resetAndClose();
      return;
    }
    setError('');
    if (!email.trim()) {
      setError('Admin email is required');
      return;
    }
    mutation.mutate();
  };

  return (
    <FormDialog
      open={!!institution}
      title={
        institution ? `Invite institution admin — ${institution.name}` : 'Invite institution admin'
      }
      submitLabel={inviteLink ? 'Done' : 'Invite or assign admin'}
      submitDisabled={!inviteLink && !email.trim()}
      saving={mutation.isPending}
      error={error}
      onSubmit={onSubmit}
      onClose={resetAndClose}
    >
      {inviteLink ? (
        <InviteLinkPanel
          email={email}
          inviteLink={inviteLink}
          message="No email service is configured. Send this one-time registration link to the institution admin. After accepting it, they can sign in here and invite the institution's members."
        />
      ) : (
        <>
          <Field label="Admin email" htmlFor="assign-admin-email">
            <input
              id="assign-admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.edu"
              autoFocus
              className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"
            />
          </Field>

          <Field label="Admin name" htmlFor="assign-admin-name">
            <input
              id="assign-admin-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Admin name"
              className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"
            />
          </Field>
          <p className="text-xs text-(--cui-color-text-muted)">
            The email does not need to be an existing user. New and tenant-less accounts receive an
            invitation.
          </p>
        </>
      )}
    </FormDialog>
  );
}

function InviteLinkPanel({
  email,
  inviteLink,
  message,
}: {
  email: string;
  inviteLink: string;
  message: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      notifySuccess('Invitation link copied');
    } catch {
      notifyError('Could not copy automatically. Select and copy the link below.');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
        <p className="font-medium text-(--cui-color-text-default)">Admin invitation ready</p>
        <p className="mt-1 text-sm text-(--cui-color-text-muted)">{message}</p>
        <p className="mt-2 text-sm text-(--cui-color-text-default)">{email}</p>
      </div>
      <label
        htmlFor="institution-admin-invite-link"
        className="text-sm font-medium text-(--cui-color-text-default)"
      >
        Registration link
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="institution-admin-invite-link"
          type="text"
          readOnly
          value={inviteLink}
          className="min-w-0 flex-1 rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"
        />
        <button
          type="button"
          onClick={copyLink}
          className="rounded-lg border border-(--cui-color-stroke-default) px-3 py-2 text-sm text-(--cui-color-text-default) transition-colors hover:bg-(--cui-color-background-hover)"
        >
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
      <p className="text-xs text-(--cui-color-text-muted)">
        This link expires in seven days and should be shared only with the intended administrator.
      </p>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-(--cui-color-text-default)">
        {label}
      </label>
      {children}
    </div>
  );
}
