import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createStandaloneInviteFn, listUsagePackagesFn } from '@/server';
import { PACKAGES_QUERY_KEY } from '@/components/packages/keys';
import { EmptyState, FormDialog, LoadingState } from '@/components/shared';
import { formatTaka, notifyError, notifySuccess } from '@/utils';

export function InviteIndividualUserDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  /** Empty means the individuals' trial package. */
  const [packageKey, setPackageKey] = useState('');
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false);

  const packagesQuery = useQuery({
    queryKey: [...PACKAGES_QUERY_KEY, false],
    queryFn: () => listUsagePackagesFn({ data: {} }),
    enabled: open,
  });
  const packages = (packagesQuery.data?.packages ?? []).filter(
    (pkg) => pkg.active && pkg.scopes.includes('member'),
  );

  const resetAndClose = () => {
    setEmail('');
    setUsername('');
    setPackageKey('');
    setError('');
    setInviteLink(null);
    setConfirmation(false);
    onClose();
  };

  const mutation = useMutation({
    mutationFn: () =>
      createStandaloneInviteFn({
        data: {
          email: email.trim(),
          username: username.trim() || undefined,
          usagePackageKey: packageKey || undefined,
        },
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['platformUsers'] });
      if (result.inviteLink) {
        setInviteLink(result.inviteLink);
        notifySuccess('Individual user invitation generated');
        return;
      }
      setConfirmation(true);
      notifySuccess('Individual user invitation emailed');
    },
    onError: (err: Error) => notifyError(err.message),
  });

  const submit = () => {
    if (inviteLink || confirmation) {
      resetAndClose();
      return;
    }
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter a valid email address');
      return;
    }
    if (username.trim() && (username.trim().length < 2 || username.trim().length > 80)) {
      setError('Username must be between 2 and 80 characters');
      return;
    }
    mutation.mutate();
  };

  const unavailable = packagesQuery.isError || packagesQuery.isLoading;

  return (
    <FormDialog
      open={open}
      title="Invite individual user"
      submitLabel={inviteLink || confirmation ? 'Done' : 'Send invitation'}
      submitDisabled={!inviteLink && !confirmation && unavailable}
      saving={mutation.isPending}
      error={error || (packagesQuery.isError ? packagesQuery.error.message : '')}
      size="lg"
      onSubmit={submit}
      onClose={resetAndClose}
    >
      <DialogBody
        email={email}
        inviteLink={inviteLink}
        confirmation={confirmation}
        loading={packagesQuery.isLoading}
        failed={packagesQuery.isError}
      >
        <div className="flex flex-col gap-4">
          <Field label="Email address" htmlFor="individual-user-email">
            <input
              id="individual-user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              placeholder="person@example.com"
              className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"
            />
          </Field>
          <Field label="Username (optional)" htmlFor="individual-user-username">
            <input
              id="individual-user-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Prefill for registration"
              className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"
            />
          </Field>
          <Field label="Usage package" htmlFor="individual-user-package">
            <select
              id="individual-user-package"
              value={packageKey}
              onChange={(e) => setPackageKey(e.target.value)}
              className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"
            >
              <option value="">Trial package (default)</option>
              {packages.map((pkg) => (
                <option key={pkg.key} value={pkg.key}>
                  {pkg.name} — {formatTaka(pkg.monthlyCredit)}/month
                </option>
              ))}
            </select>
          </Field>
        </div>
      </DialogBody>
    </FormDialog>
  );
}

/** What the dialog shows: the result once sent, the load state of the packages, else the form. */
function DialogBody({
  email,
  inviteLink,
  confirmation,
  loading,
  failed,
  children,
}: {
  email: string;
  inviteLink: string | null;
  confirmation: boolean;
  loading: boolean;
  failed: boolean;
  children: ReactNode;
}) {
  if (inviteLink) {
    return <InviteLinkPanel email={email} inviteLink={inviteLink} />;
  }
  if (confirmation) {
    return (
      <p className="text-sm text-(--cui-color-text-default)">
        The invitation email was sent to <strong>{email}</strong>. They can choose a different
        username during registration.
      </p>
    );
  }
  if (loading) {
    return <LoadingState />;
  }
  if (failed) {
    return <EmptyState message="Usage packages could not be loaded. Try again later." />;
  }
  return <>{children}</>;
}

function InviteLinkPanel({ email, inviteLink }: { email: string; inviteLink: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      notifySuccess('Invitation link copied');
    } catch {
      notifyError('Could not copy automatically. Select and copy the link below.');
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-(--cui-color-text-default)">
        Email delivery is unavailable. Send this one-time registration link to{' '}
        <strong>{email}</strong>.
      </p>
      <div className="flex gap-2">
        <input
          aria-label="Registration link"
          readOnly
          value={inviteLink}
          className="min-w-0 flex-1 rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"
        />
        <button
          type="button"
          onClick={copy}
          className="rounded-lg border border-(--cui-color-stroke-default) px-3 py-2 text-sm"
        >
          Copy
        </button>
      </div>
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
