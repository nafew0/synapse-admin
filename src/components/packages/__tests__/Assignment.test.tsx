import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createToast } from '@clickhouse/click-ui';
import type * as t from '@/types';
import '@/locales/i18n';

vi.mock('@clickhouse/click-ui', () => ({
  createToast: vi.fn(),
  Icon: () => <span />,
  Button: ({
    label,
    onClick,
    disabled,
  }: {
    label?: string;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {label}
    </button>
  ),
}));

const server = vi.hoisted(() => ({
  listUsagePackagesFn: vi.fn(),
  setInstitutionUsagePackageFn: vi.fn(),
  clearInstitutionUsagePackageFn: vi.fn(),
  setUserUsagePackageFn: vi.fn(),
  clearUserUsagePackageFn: vi.fn(),
}));

vi.mock('@/server', () => server);

import { InstitutionPackageCard, MemberPackageCard, TrialPackageCard } from '../Assignment';

const pkg = (overrides: Partial<t.UsagePackage>): t.UsagePackage => ({
  key: 'standard',
  name: 'Standard',
  description: '',
  scopes: ['member'],
  price: 600,
  monthlyCredit: 600,
  weeklyPercent: null,
  unlimited: false,
  active: true,
  sortOrder: 0,
  effectiveWeeklyPercent: 35,
  monthlyUsd: 600 / 123,
  weeklyUsd: (600 / 123) * 0.35,
  monthlyCredits: 4_878_048,
  weeklyCredits: 1_707_317,
  updatedAt: null,
  ...overrides,
});

const packages = [
  pkg({}),
  pkg({ key: 'pool', name: 'Pool', scopes: ['institution'], monthlyCredit: 30000 }),
  pkg({ key: 'legacy', name: 'Legacy', active: false }),
];

function renderWithClient(node: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

const optionNames = (select: HTMLElement) =>
  within(select)
    .getAllByRole('option')
    .map((option) => option.textContent);

beforeEach(() => {
  Object.values(server).forEach((fn) => fn.mockReset());
  server.listUsagePackagesFn.mockResolvedValue({ pricing: {}, packages });
  server.setInstitutionUsagePackageFn.mockResolvedValue({ usagePackage: null });
  server.clearInstitutionUsagePackageFn.mockResolvedValue({ usagePackage: null });
  server.setUserUsagePackageFn.mockResolvedValue({ usagePackage: null });
  server.clearUserUsagePackageFn.mockResolvedValue({ usagePackage: null });
});

describe('InstitutionPackageCard', () => {
  it('offers only active packages meant for each kind of account', async () => {
    renderWithClient(<InstitutionPackageCard tenantId="uni" current={null} />);
    const own = await screen.findByLabelText('Institution package');
    const member = screen.getByLabelText('Default member package');
    expect(optionNames(own)).toEqual(['No institution limit', 'Pool · ৳30,000/month · $1.71/week']);
    expect(optionNames(member)).toEqual([
      'No member package',
      'Standard · ৳600/month · $1.71/week',
    ]);
    expect(screen.getByText(/uses its token usage policy/)).toBeInTheDocument();
  });

  it('keeps showing a current package after it is archived', async () => {
    renderWithClient(
      <InstitutionPackageCard
        tenantId="uni"
        current={{ packageKey: null, memberPackageKey: 'legacy' }}
      />,
    );
    const member = await screen.findByLabelText('Default member package');
    expect(member).toHaveValue('legacy');
    expect(optionNames(member)).toContain('Legacy · ৳600/month · $1.71/week · Archived');
  });

  it('saves both packages, and only once something changed', async () => {
    renderWithClient(<InstitutionPackageCard tenantId="uni" current={null} />);
    await screen.findByLabelText('Institution package');
    const save = screen.getByText('Save');
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Institution package'), { target: { value: 'pool' } });
    fireEvent.change(screen.getByLabelText('Default member package'), {
      target: { value: 'standard' },
    });
    fireEvent.click(save);
    await waitFor(() =>
      expect(server.setInstitutionUsagePackageFn).toHaveBeenCalledWith({
        data: { tenantId: 'uni', packageKey: 'pool', memberPackageKey: 'standard' },
      }),
    );
  });

  it('removes the assignment when both are set back to none', async () => {
    renderWithClient(
      <InstitutionPackageCard
        tenantId="uni"
        current={{ packageKey: 'pool', memberPackageKey: null }}
      />,
    );
    fireEvent.change(await screen.findByLabelText('Institution package'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() =>
      expect(server.clearInstitutionUsagePackageFn).toHaveBeenCalledWith({
        data: { tenantId: 'uni' },
      }),
    );
    expect(server.setInstitutionUsagePackageFn).not.toHaveBeenCalled();
  });
});

describe('MemberPackageCard', () => {
  it('assigns a package that expires at the end of the chosen day', async () => {
    renderWithClient(<MemberPackageCard userId="u1" current={null} />);
    const expiry = await screen.findByLabelText('Expires (optional)');
    expect(expiry).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Member package'), { target: { value: 'standard' } });
    fireEvent.change(expiry, { target: { value: '2026-12-31' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(server.setUserUsagePackageFn).toHaveBeenCalledTimes(1));
    expect(server.setUserUsagePackageFn).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        packageKey: 'standard',
        expiresAt: new Date('2026-12-31T23:59:59').toISOString(),
      },
    });
  });

  it('returns the member to the institution default', async () => {
    renderWithClient(
      <MemberPackageCard userId="u1" current={{ packageKey: 'standard', expiresAt: null }} />,
    );
    fireEvent.change(await screen.findByLabelText('Member package'), { target: { value: '' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() =>
      expect(server.clearUserUsagePackageFn).toHaveBeenCalledWith({ data: { userId: 'u1' } }),
    );
  });
});

describe('MemberPackageCard for a bdren.ai-managed user', () => {
  const daysFromToday = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  it('points to bdren.ai first and needs a reason and an end date', async () => {
    renderWithClient(<MemberPackageCard userId="u1" current={null} managed />);
    const expiry = await screen.findByLabelText('Ends (required, at most 90 days)');
    expect(screen.getByText(/bdren.ai's superadmin override first/)).toBeInTheDocument();
    expect(expiry).toHaveAttribute('max', daysFromToday(90));

    fireEvent.change(screen.getByLabelText('Member package'), { target: { value: 'standard' } });
    const save = screen.getByText('Save');
    expect(save).toBeDisabled();

    fireEvent.change(expiry, { target: { value: daysFromToday(10) } });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'ok' } });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: '  bdren.ai is down  ' },
    });
    expect(save).toBeEnabled();

    fireEvent.change(expiry, { target: { value: daysFromToday(91) } });
    expect(save).toBeDisabled();
    fireEvent.change(expiry, { target: { value: daysFromToday(10) } });
    fireEvent.click(save);

    await waitFor(() => expect(server.setUserUsagePackageFn).toHaveBeenCalledTimes(1));
    expect(server.setUserUsagePackageFn).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        packageKey: 'standard',
        expiresAt: new Date(`${daysFromToday(10)}T23:59:59`).toISOString(),
        reason: 'bdren.ai is down',
      },
    });
  });

  it('keeps the last allowed day inside the 90-day limit', async () => {
    renderWithClient(<MemberPackageCard userId="u1" current={null} managed />);
    fireEvent.change(await screen.findByLabelText('Member package'), {
      target: { value: 'standard' },
    });
    fireEvent.change(screen.getByLabelText('Ends (required, at most 90 days)'), {
      target: { value: daysFromToday(90) },
    });
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Pilot fix' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(server.setUserUsagePackageFn).toHaveBeenCalledTimes(1));
    const { expiresAt } = server.setUserUsagePackageFn.mock.calls[0][0].data;
    expect(new Date(expiresAt).getTime()).toBeLessThan(Date.now() + 90 * 86_400_000);
  });

  it('shows the current override reason and still removes the package without one', async () => {
    renderWithClient(
      <MemberPackageCard
        userId="u1"
        managed
        current={{
          packageKey: 'standard',
          expiresAt: null,
          override: true,
          reason: 'Exam week',
        }}
      />,
    );
    expect(await screen.findByLabelText('Reason')).toHaveValue('Exam week');
    fireEvent.change(screen.getByLabelText('Member package'), { target: { value: '' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() =>
      expect(server.clearUserUsagePackageFn).toHaveBeenCalledWith({ data: { userId: 'u1' } }),
    );
  });

  it("shows bdren.ai's override and says when Synapse's own one wins", async () => {
    const bdrenOverride: t.BdrenOverride = {
      scope: 'person',
      kind: 'package',
      packageName: 'Plus',
      startsAt: '2026-11-20T00:00:00Z',
      endsAt: '2026-12-20T00:00:00Z',
    };
    const { unmount } = renderWithClient(
      <MemberPackageCard userId="u1" current={null} managed bdrenOverride={bdrenOverride} />,
    );
    const note = await screen.findByRole('status');
    expect(note).toHaveTextContent('bdren.ai has an override for this person: Plus, until 20 Dec 2026.');
    expect(note).not.toHaveTextContent('also has a Synapse override');
    unmount();

    renderWithClient(
      <MemberPackageCard
        userId="u1"
        managed
        current={{ packageKey: 'standard', expiresAt: null, override: true, reason: 'Outage' }}
        bdrenOverride={{ ...bdrenOverride, scope: 'institution', kind: 'limits', packageName: null }}
      />,
    );
    const both = await screen.findByRole('status');
    expect(both).toHaveTextContent("all members of this person's institution: custom limits");
    expect(both).toHaveTextContent('also has a Synapse override here, which wins inside Synapse');
  });

  it('shows the error Synapse returns', async () => {
    server.setUserUsagePackageFn.mockRejectedValueOnce(
      new Error('A support override needs a reason and an expiresAt'),
    );
    renderWithClient(<MemberPackageCard userId="u1" current={null} managed />);
    fireEvent.change(await screen.findByLabelText('Member package'), {
      target: { value: 'standard' },
    });
    fireEvent.change(screen.getByLabelText('Ends (required, at most 90 days)'), {
      target: { value: daysFromToday(5) },
    });
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Outage' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() =>
      expect(createToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'danger',
          title: 'A support override needs a reason and an expiresAt',
        }),
      ),
    );
  });
});

describe('MemberPackageCard reason for an unmanaged user', () => {
  it('is optional, and sent when given', async () => {
    renderWithClient(<MemberPackageCard userId="u1" current={null} />);
    fireEvent.change(await screen.findByLabelText('Member package'), {
      target: { value: 'standard' },
    });
    expect(screen.queryByText(/superadmin override first/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Reason (optional)'), {
      target: { value: 'Research grant' },
    });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() =>
      expect(server.setUserUsagePackageFn).toHaveBeenCalledWith({
        data: { userId: 'u1', packageKey: 'standard', expiresAt: null, reason: 'Research grant' },
      }),
    );
  });
});

describe('TrialPackageCard', () => {
  it('offers member packages and sets the trial on the individuals account', async () => {
    renderWithClient(<TrialPackageCard current={null} />);
    const trial = await screen.findByLabelText('Trial package');
    expect(optionNames(trial)).toEqual([
      'No trial: individuals are not metered',
      'Standard · ৳600/month · $1.71/week',
    ]);
    fireEvent.change(trial, { target: { value: 'standard' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() =>
      expect(server.setInstitutionUsagePackageFn).toHaveBeenCalledWith({
        data: { tenantId: '__individuals__', packageKey: null, memberPackageKey: 'standard' },
      }),
    );
  });

  it('clears the trial when set back to none', async () => {
    renderWithClient(<TrialPackageCard current="standard" />);
    fireEvent.change(await screen.findByLabelText('Trial package'), { target: { value: '' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() =>
      expect(server.clearInstitutionUsagePackageFn).toHaveBeenCalledWith({
        data: { tenantId: '__individuals__' },
      }),
    );
  });
});

describe('MemberPackageCard for a standalone user', () => {
  it('falls back to the trial package rather than an institution default', async () => {
    renderWithClient(<MemberPackageCard userId="u1" current={null} standalone />);
    const own = await screen.findByLabelText('Member package');
    expect(optionNames(own)[0]).toBe('Use the trial package');
    expect(screen.getByText(/replaces the trial package/)).toBeInTheDocument();
  });
});
