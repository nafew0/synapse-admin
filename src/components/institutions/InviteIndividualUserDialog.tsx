import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createStandaloneInviteFn, listStandaloneCreditPackagesFn } from '@/server';
import { EmptyState, FormDialog, LoadingState } from '@/components/shared';
import { notifyError, notifySuccess } from '@/utils';

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
  const [packageId, setPackageId] = useState('');
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false);

  const packagesQuery = useQuery({
    queryKey: ['standaloneCreditPackages'],
    queryFn: listStandaloneCreditPackagesFn,
    enabled: open,
  });
  const packages = packagesQuery.data?.list ?? [];

  const resetAndClose = () => {
    setEmail('');
    setUsername('');
    setPackageId('');
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
          creditPackageId: packageId,
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
    if (!packageId) {
      setError('Select an individual package');
      return;
    }
    mutation.mutate();
  };

  const unavailable = packagesQuery.isError || packagesQuery.isLoading || packages.length === 0;

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
      {inviteLink ? (
        <InviteLinkPanel email={email} inviteLink={inviteLink} />
      ) : confirmation ? (
        <p className="text-sm text-(--cui-color-text-default)">
          The invitation email was sent to <strong>{email}</strong>. They can choose a different
          username during registration.
        </p>
      ) : packagesQuery.isLoading ? (
        <LoadingState />
      ) : packagesQuery.isError ? (
        <EmptyState message="Individual packages could not be loaded. Try again later." />
      ) : packages.length === 0 ? (
        <EmptyState message="No individual packages are available. Create or activate a package before inviting a user." />
      ) : (
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
          <Field label="Individual package" htmlFor="individual-user-package">
            <select
              id="individual-user-package"
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
              className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"
            >
              <option value="">Select a package</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.label || pkg.name || pkg.id} — {pkg.credits.toLocaleString()} credits
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
    </FormDialog>
  );
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
