import { useEffect, useId, useState } from 'react';
import { Button, Switch } from '@clickhouse/click-ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type * as t from '@/types';
import { updatePlatformInstitutionChatAccessFn } from '@/server';
import { notifyError, notifySuccess } from '@/utils';
import { Card } from '@/components/shared';
import { useLocalize } from '@/hooks';

const MESSAGE_MAX = 500;

interface ChatAccessProps {
  institution: t.PlatformInstitution;
}

/**
 * Ends or restores chat for a whole institution, e.g. when its free trial is over. Unlike
 * suspension, members keep signing in and reading their chats; only new messages are refused.
 */
export function ChatAccess({ institution }: ChatAccessProps) {
  const localize = useLocalize();
  const messageId = useId();
  const queryClient = useQueryClient();
  const saved = institution.chatAccess;
  const [ended, setEnded] = useState(saved?.ended ?? false);
  const [message, setMessage] = useState(saved?.message ?? '');

  useEffect(() => {
    setEnded(saved?.ended ?? false);
    setMessage(saved?.message ?? '');
  }, [saved?.ended, saved?.message]);

  const save = useMutation({
    mutationFn: () =>
      updatePlatformInstitutionChatAccessFn({
        data: { tenantId: institution.tenantId, ended, message },
      }),
    onSuccess: (result) => {
      queryClient.setQueryData(['platformInstitution', institution.tenantId], result);
      notifySuccess(
        localize(ended ? 'com_chat_access_ended_saved' : 'com_chat_access_restored_saved', {
          name: institution.name,
        }),
      );
    },
    onError: (error) => notifyError(error.message),
  });

  const changed = ended !== (saved?.ended ?? false) || message.trim() !== (saved?.message ?? '');
  const tooLong = message.trim().length > MESSAGE_MAX;

  return (
    <Card
      title={localize('com_chat_access_title')}
      description={localize('com_chat_access_description')}
      action={
        <Button
          label={localize('com_chat_access_save')}
          disabled={!changed || tooLong || save.isPending}
          onClick={() => save.mutate()}
        />
      }
    >
      <label className="flex items-center gap-3 text-sm text-(--cui-color-text-default)">
        <Switch
          checked={ended}
          onCheckedChange={setEnded}
          aria-label={localize('com_chat_access_end')}
        />
        <span className="font-medium">{localize('com_chat_access_end')}</span>
      </label>
      <div className="flex flex-col gap-1.5 text-sm text-(--cui-color-text-default)">
        <label htmlFor={messageId} className="font-medium">
          {localize('com_chat_access_message')}
        </label>
        <textarea
          id={messageId}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
          maxLength={MESSAGE_MAX}
          placeholder={localize('com_chat_access_message_placeholder')}
          aria-describedby={`${messageId}-hint`}
          className="config-input w-full resize-y"
        />
        <span id={`${messageId}-hint`} className="text-xs text-(--cui-color-text-muted)">
          {localize('com_chat_access_message_hint', { max: MESSAGE_MAX })}
        </span>
      </div>
      {saved?.ended && saved.changedAt ? (
        <p className="m-0 text-xs text-(--syn-warning-fg)">
          {localize('com_chat_access_ended_since', {
            date: new Date(saved.changedAt).toLocaleString(),
          })}
        </p>
      ) : null}
    </Card>
  );
}
