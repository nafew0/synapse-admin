import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type * as t from '@/types';
import '@/locales/i18n';
import { CreditUsage } from '../CreditUsage';

const meter = (
  usedBdt: number,
  limitBdt: number | null,
  overrides: Partial<t.CreditMeter> = {},
) => ({
  used: usedBdt * 8130,
  limit: limitBdt == null ? null : limitBdt * 8130,
  remaining: limitBdt == null ? null : (limitBdt - usedBdt) * 8130,
  usedBdt,
  limitBdt,
  blocked: limitBdt != null && usedBdt >= limitBdt,
  resetsAt: '2026-10-19T00:00:00.000Z',
  ...overrides,
});

const credits: t.CreditConsole = {
  enforced: false,
  institutionPackage: 'Pool',
  defaultMemberPackage: 'Standard',
  institution: { week: meter(120, 10500), month: meter(400, 30000) },
  members: [
    {
      userId: 'u1',
      name: 'Rahim',
      email: 'rahim@uni.edu',
      package: { key: 'vip', name: 'VIP', unlimited: false },
      ownPackage: true,
      week: meter(210, 210),
      month: meter(300, 600),
    },
    {
      userId: 'u2',
      name: null,
      email: 'karim@uni.edu',
      package: { key: 'std', name: 'Standard', unlimited: false },
      ownPackage: false,
      week: meter(5, 210),
      month: meter(5, 600),
    },
  ],
};

describe('CreditUsage', () => {
  it('shows the pooled allowance in taka for the week and the month', () => {
    render(<CreditUsage credits={credits} />);
    expect(
      screen.getByText('Institution package: Pool. Default member package: Standard.'),
    ).toBeInTheDocument();
    expect(screen.getByText('৳120 of ৳10,500')).toBeInTheDocument();
    expect(screen.getByText('৳400 of ৳30,000')).toBeInTheDocument();
    expect(screen.getByText(/Shadow mode/)).toBeInTheDocument();
  });

  it('lists members against their own packages and marks a used-up week', () => {
    render(<CreditUsage credits={credits} />);
    const rahim = screen.getByText('Rahim').closest('tr') as HTMLElement;
    expect(within(rahim).getByText('VIP')).toBeInTheDocument();
    expect(within(rahim).getByText('own package')).toBeInTheDocument();
    expect(within(rahim).getByText('৳210 of ৳210')).toHaveClass('font-medium');
    const karim = screen.getByText('karim@uni.edu').closest('tr') as HTMLElement;
    expect(within(karim).queryByText('own package')).toBeNull();
  });

  it('says so when no member has used the allowance', () => {
    render(<CreditUsage credits={{ ...credits, members: [] }} />);
    expect(screen.getByText(/No member has used the allowance/)).toBeInTheDocument();
  });
});
