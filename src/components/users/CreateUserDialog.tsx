import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type * as t from '@/types';
import { FormDialog } from '@/components/shared';
import { inviteMemberFn } from '@/server';
import { notifyError, notifySuccess } from '@/utils';

export function CreateUserDialog({ open, onClose }: t.CreateUserDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<t.MemberRole>('USER');
  const [error, setError] = useState('');

  const resetAndClose = () => {
    setName('');
    setEmail('');
    setRole('USER');
    setError('');
    onClose();
  };

  const mutation = useMutation({
    mutationFn: () => inviteMemberFn({ data: { name, email, role } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      notifySuccess('Invitation created');
      resetAndClose();
    },
    onError: (err: Error) => notifyError(err.message),
  });

  const onSubmit = () => {
    setError('');
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    mutation.mutate();
  };

  return (
    <FormDialog
      open={open}
      title="Invite member"
      submitLabel="Send invite"
      submitDisabled={!name.trim() || !email.trim()}
      saving={mutation.isPending}
      error={error}
      onSubmit={onSubmit}
      onClose={resetAndClose}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="member-name" className="text-sm font-medium text-(--cui-color-text-default)">
          Name
        </label>
        <input
          id="member-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Member name"
          autoFocus
          className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="member-email" className="text-sm font-medium text-(--cui-color-text-default)">
          Email
        </label>
        <input
          id="member-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="member-role" className="text-sm font-medium text-(--cui-color-text-default)">
          Role
        </label>
        <select
          id="member-role"
          value={role}
          onChange={(e) => setRole(e.target.value as t.MemberRole)}
          className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"
        >
          <option value="USER">Member</option>
          <option value="INSTITUTION_ADMIN">Institution admin</option>
        </select>
      </div>
    </FormDialog>
  );
}
