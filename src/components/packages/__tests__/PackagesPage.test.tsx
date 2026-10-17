import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as t from '@/types';
import '@/locales/i18n';

const routeUser = vi.hoisted(() => ({ current: { isPlatformSuperadmin: true } }));

vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({ useRouteContext: () => ({ user: routeUser.current }) }),
}));

type FieldProps = {
  label?: string;
  value?: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
};

function MockField({ label, value, disabled, placeholder, onChange }: FieldProps) {
  return (
    <label>
      {label}
      <input
        aria-label={label}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

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
    <button type={onClick ? 'button' : 'submit'} onClick={onClick} disabled={disabled}>
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
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onCheckedChange?.(!checked)}
    />
  ),
  TextField: MockField,
  NumberField: MockField,
  Dialog: Object.assign(
    ({ open, children }: { open: boolean; children: React.ReactNode }) =>
      open ? <div role="dialog">{children}</div> : null,
    {
      Content: ({ title, children }: { title: string; children: React.ReactNode }) => (
        <div>
          <h2>{title}</h2>
          {children}
        </div>
      ),
    },
  ),
}));

const server = vi.hoisted(() => ({
  listUsagePackagesFn: vi.fn(),
  createUsagePackageFn: vi.fn(),
  updateUsagePackageFn: vi.fn(),
  archiveUsagePackageFn: vi.fn(),
  updateUsagePricingFn: vi.fn(),
}));

vi.mock('@/server', () => server);

import { PackagesPage } from '../PackagesPage';

const defaultPricing: t.UsagePricing = {
  bdtPerUsd: 123,
  providerFeePercent: 0,
  defaultWeeklyPercent: 35,
  configured: false,
  bdtPerUsdEffective: 123,
  updatedAt: null,
};

const starter: t.UsagePackage = {
  key: 'starter',
  name: 'Starter',
  description: 'For most members',
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
  updatedAt: '2026-10-18T00:00:00.000Z',
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PackagesPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  routeUser.current = { isPlatformSuperadmin: true };
  Object.values(server).forEach((fn) => fn.mockReset());
  server.listUsagePackagesFn.mockResolvedValue({ pricing: defaultPricing, packages: [starter] });
});

describe('PackagesPage', () => {
  it('lists packages with their taka allowance and dollar conversion', async () => {
    renderPage();
    const row = (await screen.findByText('Starter')).closest('tr') as HTMLElement;
    expect(within(row).getAllByText('৳300')).toHaveLength(2);
    expect(within(row).getByText('$2.44')).toBeInTheDocument();
    expect(within(row).getByText('35%')).toBeInTheDocument();
    expect(within(row).getByText('Members')).toBeInTheDocument();
  });

  it('warns that pricing is unsaved while the defaults are in use', async () => {
    renderPage();
    expect(await screen.findByText(/Not saved yet/)).toBeInTheDocument();
    expect(screen.getByText('৳123.00 buys $1 of usage.')).toBeInTheDocument();
  });

  it('shows an empty state when there are no packages', async () => {
    server.listUsagePackagesFn.mockResolvedValue({ pricing: defaultPricing, packages: [] });
    renderPage();
    expect(await screen.findByText(/No packages yet/)).toBeInTheDocument();
  });

  it('shows the error when packages fail to load', async () => {
    server.listUsagePackagesFn.mockRejectedValue(new Error('Backend unavailable'));
    renderPage();
    expect(await screen.findByText('Backend unavailable')).toBeInTheDocument();
  });

  it('refuses access to anyone but a platform superadmin', () => {
    routeUser.current = { isPlatformSuperadmin: false };
    renderPage();
    expect(screen.getByText(/Platform superadmin access is required/)).toBeInTheDocument();
    expect(server.listUsagePackagesFn).not.toHaveBeenCalled();
  });

  it('creates a package from the dialog with a live dollar preview', async () => {
    server.createUsagePackageFn.mockResolvedValue({
      package: { ...starter, key: 'pro', name: 'Pro' },
    });
    renderPage();
    fireEvent.click(await screen.findByText('New package'));

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Pro Plan' } });
    expect(screen.getByLabelText('Key')).toHaveValue('pro-plan');
    fireEvent.change(screen.getByLabelText('Price per month (৳)'), { target: { value: '400' } });
    fireEvent.change(screen.getByLabelText('API usage per month (৳)'), {
      target: { value: '1230' },
    });

    expect(screen.getByText('$10.00')).toBeInTheDocument();
    expect(screen.getByText('$3.50')).toBeInTheDocument();
    expect(screen.getByText('10,000,000')).toBeInTheDocument();
    expect(screen.getByText('Customers get 3.08× their payment in usage.')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(server.createUsagePackageFn).toHaveBeenCalledTimes(1));
    expect(server.createUsagePackageFn).toHaveBeenCalledWith({
      data: {
        key: 'pro-plan',
        name: 'Pro Plan',
        description: '',
        scopes: ['member'],
        price: 400,
        monthlyCredit: 1230,
        weeklyPercent: null,
        unlimited: false,
        sortOrder: 0,
        active: true,
      },
    });
  });

  it('blocks saving a package without a monthly allowance', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('New package'));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Empty' } });
    fireEvent.click(screen.getByText('Save'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/positive monthly usage/);
    expect(server.createUsagePackageFn).not.toHaveBeenCalled();
  });

  it('edits a package without letting its key change', async () => {
    server.updateUsagePackageFn.mockResolvedValue({ package: starter });
    renderPage();
    const row = (await screen.findByText('Starter')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByText('Edit'));

    expect(screen.getByLabelText('Key')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Weekly cap (% of monthly)'), {
      target: { value: '50' },
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(server.updateUsagePackageFn).toHaveBeenCalledTimes(1));
    expect(server.updateUsagePackageFn.mock.calls[0][0]).toMatchObject({
      data: { key: 'starter', patch: { weeklyPercent: 50, monthlyCredit: 300 } },
    });
  });

  it('saves pricing', async () => {
    server.updateUsagePricingFn.mockResolvedValue({
      pricing: { ...defaultPricing, bdtPerUsd: 120, configured: true },
    });
    renderPage();
    fireEvent.change(await screen.findByLabelText('Taka per US dollar'), {
      target: { value: '120' },
    });
    fireEvent.click(screen.getByText('Save pricing'));
    await waitFor(() =>
      expect(server.updateUsagePricingFn).toHaveBeenCalledWith({
        data: { bdtPerUsd: 120, providerFeePercent: 0, defaultWeeklyPercent: 35 },
      }),
    );
  });

  it('archives a package after confirmation', async () => {
    server.archiveUsagePackageFn.mockResolvedValue({ package: { ...starter, active: false } });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();
    const row = (await screen.findByText('Starter')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByText('Archive'));
    await waitFor(() =>
      expect(server.archiveUsagePackageFn).toHaveBeenCalledWith({ data: { key: 'starter' } }),
    );
    expect(confirm).toHaveBeenCalled();
    confirm.mockRestore();
  });
});
