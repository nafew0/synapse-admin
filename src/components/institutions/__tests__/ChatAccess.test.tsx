import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as t from '@/types';

const createToast = vi.fn();

vi.mock('@clickhouse/click-ui', () => ({
  createToast: (...args: unknown[]) => createToast(...args),
  Button: ({
    label,
    onClick,
    disabled,
  }: {
    label?: string;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  ),
  Switch: ({
    checked,
    onCheckedChange,
    'aria-label': ariaLabel,
  }: {
    checked: boolean;
    onCheckedChange?: (value: boolean) => void;
    'aria-label'?: string;
  }) => (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onCheckedChange?.(!checked)}
    />
  ),
}));

vi.mock('@/server', () => ({ updatePlatformInstitutionChatAccessFn: vi.fn() }));

/** Tests run without loading translations, so every label reads as its key. */
const { ChatAccess } = await import('../ChatAccess');
const { updatePlatformInstitutionChatAccessFn } = await import('@/server');
const update = vi.mocked(updatePlatformInstitutionChatAccessFn);

const message = 'Your free trial has finished. Please contact LEARN to get more usage.';
const learn: t.PlatformInstitution = { tenantId: 'learn', name: 'LEARN', status: 'active' };

function renderCard(institution: t.PlatformInstitution) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ChatAccess institution={institution} />
    </QueryClientProvider>,
  );
  return client;
}

describe('institution chat access', () => {
  beforeEach(() => {
    update.mockReset();
    createToast.mockReset();
  });

  it('saves nothing until something changes', () => {
    renderCard(learn);
    expect(screen.getByRole('button', { name: 'com_chat_access_save' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'com_chat_access_end' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('ends chat access with the message and caches the result', async () => {
    const ended = {
      ...learn,
      chatAccess: { ended: true, message, changedAt: '2026-11-09T06:00:00Z' },
    };
    update.mockResolvedValue({ institution: ended });
    const client = renderCard(learn);

    fireEvent.click(screen.getByRole('switch', { name: 'com_chat_access_end' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'com_chat_access_message' }), {
      target: { value: message },
    });
    fireEvent.click(screen.getByRole('button', { name: 'com_chat_access_save' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({ data: { tenantId: 'learn', ended: true, message } }),
    );
    await waitFor(() =>
      expect(client.getQueryData(['platformInstitution', 'learn'])).toEqual({ institution: ended }),
    );
    expect(createToast).toHaveBeenCalledWith({
      type: 'success',
      title: 'com_chat_access_ended_saved',
    });
  });

  it('shows when access ended and restores it', async () => {
    update.mockResolvedValue({
      institution: { ...learn, chatAccess: { ended: false, message } },
    });
    renderCard({
      ...learn,
      chatAccess: { ended: true, message, changedAt: '2026-11-09T06:00:00Z' },
    });

    expect(screen.getByText('com_chat_access_ended_since')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'com_chat_access_end' }));
    fireEvent.click(screen.getByRole('button', { name: 'com_chat_access_save' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({ data: { tenantId: 'learn', ended: false, message } }),
    );
  });

  it('reports a failed save', async () => {
    update.mockRejectedValue(new Error('Failed to update chat access'));
    renderCard(learn);

    fireEvent.click(screen.getByRole('switch', { name: 'com_chat_access_end' }));
    fireEvent.click(screen.getByRole('button', { name: 'com_chat_access_save' }));

    await waitFor(() =>
      expect(createToast).toHaveBeenCalledWith({
        type: 'danger',
        title: 'Failed to update chat access',
      }),
    );
  });
});
