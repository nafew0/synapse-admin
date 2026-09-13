import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClickUIProvider } from '@clickhouse/click-ui';
import type * as t from '@/types';

const getCounts = vi.fn();
const resendBulk = vi.fn();
const listInstitutions = vi.fn();

vi.mock('@/server', () => ({
  getResendableInviteCountsFn: (...args: unknown[]) => getCounts(...args),
  resendInvitesBulkFn: (...args: unknown[]) => resendBulk(...args),
  listPlatformInstitutionsFn: (...args: unknown[]) => listInstitutions(...args),
}));

const notifyError = vi.fn();
vi.mock('@/utils', () => ({
  notifyError: (...args: unknown[]) => notifyError(...args),
  notifySuccess: vi.fn(),
}));

/** jsdom implements no media queries; the theme provider probes for the system
 *  colour scheme on mount. */
vi.stubGlobal(
  'matchMedia',
  (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
);

const { ResendInvitesDialog } = await import('../ResendInvitesDialog');

function renderDialog(props: Partial<t.ResendInvitesDialogProps> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  /** click-ui reads its tokens from styled-components, so the dialog cannot mount
   *  outside a ClickUIProvider — the same wrapper `__root.tsx` puts around the app. */
  return render(
    <ClickUIProvider theme="light">
      <QueryClientProvider client={client}>
        <ResendInvitesDialog
          open
          onClose={props.onClose ?? vi.fn()}
          platform={props.platform ?? false}
          tenantFilter={props.tenantFilter ?? 'all'}
        />
      </QueryClientProvider>
    </ClickUIProvider>,
  );
}

const counts = (expired: number, pending: number) => ({
  counts: { expired, pending, all: expired + pending },
});

describe('ResendInvitesDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCounts.mockResolvedValue(counts(3, 2));
    listInstitutions.mockResolvedValue({ institutions: [] });
    resendBulk.mockResolvedValue({
      summary: { total: 5, sent: 5, linkOnly: 0, skipped: 0, failed: 0 },
      results: [],
    });
  });

  it('labels each audience with its live count', async () => {
    renderDialog();

    expect(await screen.findByText(/Invitation expired \(3\)/)).toBeInTheDocument();
    expect(screen.getByText(/Awaiting activation \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/Both \(5\)/)).toBeInTheDocument();
  });

  /** An audience with nothing in it must not be selectable — a resend of zero
   *  recipients is a wasted confirmation step. */
  it('disables an audience with no recipients', async () => {
    getCounts.mockResolvedValue(counts(0, 4));
    renderDialog();

    await screen.findByText(/Invitation expired \(0\)/);
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toBeDisabled();
    expect(radios[1]).not.toBeDisabled();
  });

  it('warns that existing links stop working before sending', async () => {
    const user = userEvent.setup();
    renderDialog();

    await screen.findByText(/Both \(5\)/);
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText(/will stop working/i)).toBeInTheDocument();
    expect(resendBulk).not.toHaveBeenCalled();
  });

  it('sends the chosen audience only after confirmation', async () => {
    const user = userEvent.setup();
    renderDialog();

    await screen.findByText(/Invitation expired \(3\)/);
    await user.click(screen.getAllByRole('radio')[0]);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Resend' }));

    await waitFor(() => expect(resendBulk).toHaveBeenCalledTimes(1));
    expect(resendBulk).toHaveBeenCalledWith({
      data: expect.objectContaining({ audience: 'expired' }),
    });
  });

  it('lets the reader back out of the confirmation', async () => {
    const user = userEvent.setup();
    renderDialog();

    await screen.findByText(/Both \(5\)/);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    expect(resendBulk).not.toHaveBeenCalled();
  });

  /** Without email configured the link is the only way the invitee can register,
   *  so it has to be visible rather than discarded with the response. */
  it('surfaces invite links for recipients email could not reach', async () => {
    const user = userEvent.setup();
    resendBulk.mockResolvedValue({
      summary: { total: 2, sent: 1, linkOnly: 1, skipped: 0, failed: 0 },
      results: [
        { inviteId: '1', email: 'ok@x.bd', outcome: 'sent' },
        {
          inviteId: '2',
          email: 'bad@x.bd',
          outcome: 'link_only',
          inviteLink: 'https://app/register?token=abc',
        },
      ],
    });
    renderDialog();

    await screen.findByText(/Both \(5\)/);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Resend' }));

    expect(await screen.findByText('bad@x.bd')).toBeInTheDocument();
    expect(screen.getByText('https://app/register?token=abc')).toBeInTheDocument();
  });

  it('explains why invitations were skipped', async () => {
    const user = userEvent.setup();
    resendBulk.mockResolvedValue({
      summary: { total: 3, sent: 0, linkOnly: 0, skipped: 3, failed: 0 },
      results: [],
    });
    renderDialog();

    await screen.findByText(/Both \(5\)/);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Resend' }));

    expect(await screen.findByText(/already sent in the last few minutes/i)).toBeInTheDocument();
  });

  it('reports a failed send instead of dropping it', async () => {
    const user = userEvent.setup();
    resendBulk.mockRejectedValue(new Error('Batch too large'));
    renderDialog();

    await screen.findByText(/Both \(5\)/);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Resend' }));

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Batch too large'));
  });

  describe('superadmin', () => {
    it('offers an institution selector seeded from the page filter', async () => {
      listInstitutions.mockResolvedValue({
        institutions: [{ tenantId: 'tenant-a', name: 'Alpha University' }],
      });
      renderDialog({ platform: true, tenantFilter: 'tenant-a' });

      /** The select renders before the institution list resolves, so wait for the
       *  option to exist before asserting the seeded value. */
      await screen.findByRole('option', { name: 'Alpha University' });

      const select = screen.getByRole('combobox');
      expect((select as HTMLSelectElement).value).toBe('tenant-a');
      expect(screen.getByRole('option', { name: 'All institutions' })).toBeInTheDocument();
    });

    it('does not show the selector to an institution admin', async () => {
      renderDialog({ platform: false });

      await screen.findByText(/Both \(5\)/);
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('maps the standalone bucket to accountScope, not a tenant id', async () => {
      renderDialog({ platform: true, tenantFilter: 'others' });

      await waitFor(() => expect(getCounts).toHaveBeenCalled());
      expect(getCounts).toHaveBeenLastCalledWith({
        data: expect.objectContaining({ accountScope: 'standalone', tenantId: undefined }),
      });
    });
  });
});
