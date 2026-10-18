import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as t from '@/types';
import '@/locales/i18n';

vi.mock('@clickhouse/click-ui', () => ({ createToast: vi.fn(), Icon: () => <span /> }));

vi.mock('@/components/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/shared')>()),
  FormDialog: ({
    submitLabel,
    onSubmit,
    children,
  }: {
    submitLabel: string;
    onSubmit: () => void;
    children: React.ReactNode;
  }) => (
    <div>
      {children}
      <button type="button" onClick={onSubmit}>
        {submitLabel}
      </button>
    </div>
  ),
}));

const server = vi.hoisted(() => ({
  listUsagePackagesFn: vi.fn(),
  createStandaloneInviteFn: vi.fn(),
}));

vi.mock('@/server', () => server);

import { InviteIndividualUserDialog } from '../InviteIndividualUserDialog';

const pkg = (overrides: Partial<t.UsagePackage>): t.UsagePackage => ({
  key: 'plus',
  name: 'Plus',
  description: '',
  scopes: ['member'],
  price: 300,
  monthlyCredit: 300,
  weeklyPercent: null,
  unlimited: false,
  active: true,
  sortOrder: 0,
  effectiveWeeklyPercent: 35,
  monthlyUsd: 300 / 123,
  weeklyUsd: (300 / 123) * 0.35,
  monthlyCredits: 2_439_024,
  weeklyCredits: 853_658,
  updatedAt: null,
  ...overrides,
});

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <InviteIndividualUserDialog open onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  Object.values(server).forEach((fn) => fn.mockReset());
  server.listUsagePackagesFn.mockResolvedValue({
    pricing: {},
    packages: [
      pkg({}),
      pkg({ key: 'pool', name: 'Pool', scopes: ['institution'] }),
      pkg({ key: 'old', name: 'Old', active: false }),
    ],
  });
  server.createStandaloneInviteFn.mockResolvedValue({ invite: {}, inviteLink: null });
});

describe('InviteIndividualUserDialog', () => {
  it('offers the trial by default and only active member packages', async () => {
    renderDialog();
    const select = await screen.findByLabelText('Usage package');
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Trial package (default)', 'Plus — ৳300/month']);
  });

  it('invites on the trial when no package is chosen', async () => {
    renderDialog();
    fireEvent.change(await screen.findByLabelText('Email address'), {
      target: { value: 'solo@example.test' },
    });
    fireEvent.click(screen.getByText('Send invitation'));
    await waitFor(() =>
      expect(server.createStandaloneInviteFn).toHaveBeenCalledWith({
        data: { email: 'solo@example.test', username: undefined, usagePackageKey: undefined },
      }),
    );
  });

  it('sends the chosen package with the invitation', async () => {
    renderDialog();
    fireEvent.change(await screen.findByLabelText('Email address'), {
      target: { value: 'plus@example.test' },
    });
    fireEvent.change(screen.getByLabelText('Usage package'), { target: { value: 'plus' } });
    fireEvent.click(screen.getByText('Send invitation'));
    await waitFor(() =>
      expect(server.createStandaloneInviteFn).toHaveBeenCalledWith({
        data: { email: 'plus@example.test', username: undefined, usagePackageKey: 'plus' },
      }),
    );
  });
});
