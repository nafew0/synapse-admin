import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
