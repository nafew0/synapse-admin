import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type * as t from '@/types';
import translations from '@/locales/en/translation.json';
import { AlertsBanner } from '../AlertsBanner';
import { AlertsPage } from '../AlertsPage';

const server = vi.hoisted(() => ({
  listAlertsFn: vi.fn(),
  markAlertsSeenFn: vi.fn(),
  checkAlertsFn: vi.fn(),
}));

vi.mock('@/server', () => server);

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Link: ({ to, children, className }: { to: string; children: string; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/shared', () => ({
  LoadingState: () => <div>loading</div>,
  EmptyState: ({ message }: { message: string }) => <div>{message}</div>,
}));

vi.mock('@/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils')>()),
  notifyError: vi.fn(),
}));

vi.mock('@/hooks/useLocalize', () => ({
  useLocalize: () => (key: string, options?: Record<string, string | number>) =>
    Object.entries(options ?? {}).reduce(
      (text, [name, value]) => text.replace(`{{${name}}}`, String(value)),
      (translations as Record<string, string>)[key] ?? key,
    ),
}));

const alert = (overrides: Partial<t.PlatformAlert>): t.PlatformAlert => ({
  _id: 'a1',
  key: 'openrouter_key',
  kind: 'openrouter_key',
  severity: 'critical',
  title: 'OpenRouter is rejecting our API key',
  detail: 'OpenRouter answered HTTP 401: User not found.',
  status: 'open',
  firstSeenAt: '2026-11-17T04:00:00.000Z',
  lastSeenAt: '2026-11-17T04:15:00.000Z',
  ...overrides,
});

const list = (alerts: t.PlatformAlert[]): t.PlatformAlertList => ({
  alerts,
  unseen: alerts.filter((a) => a.status === 'open' && !a.seenAt).length,
});

const withClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

beforeEach(() => {
  server.listAlertsFn.mockReset();
  server.markAlertsSeenFn.mockReset().mockResolvedValue({ changed: 1 });
  server.checkAlertsFn.mockReset();
});

describe('AlertsBanner', () => {
  it('shows a failing OpenRouter key as a critical banner', async () => {
    server.listAlertsFn.mockResolvedValue(list([alert({})]));

    withClient(<AlertsBanner />);

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('OpenRouter is rejecting our API key');
    expect(banner).toHaveTextContent('HTTP 401: User not found');
    expect(banner).toHaveTextContent('Critical');
  });

  it('shows a low balance as a warning banner', async () => {
    server.listAlertsFn.mockResolvedValue(
      list([
        alert({
          _id: 'b1',
          key: 'openrouter_balance',
          kind: 'openrouter_balance',
          severity: 'warning',
          title: 'OpenRouter credit is running low',
          detail: '$1.20 left on the key or account.',
        }),
      ]),
    );

    withClient(<AlertsBanner />);

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('OpenRouter credit is running low');
    expect(banner).toHaveTextContent('Warning');
  });

  it('puts critical alerts first and says how many more there are', async () => {
    server.listAlertsFn.mockResolvedValue(
      list([
        alert({ _id: 'w1', severity: 'warning', title: 'Warning one' }),
        alert({ _id: 'w2', severity: 'warning', title: 'Warning two' }),
        alert({ _id: 'c1', severity: 'critical', title: 'Critical one' }),
      ]),
    );

    withClient(<AlertsBanner />);

    const bars = await screen.findAllByRole('alert');
    expect(bars).toHaveLength(2);
    expect(bars[0]).toHaveTextContent('Critical one');
    expect(screen.getByText('+1 more')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /All alerts/ })).toHaveAttribute('href', '/alerts');
  });

  it('marks an alert seen and refreshes', async () => {
    server.listAlertsFn
      .mockResolvedValueOnce(list([alert({})]))
      .mockResolvedValue(list([alert({ seenAt: '2026-11-20T06:00:00.000Z' })]));

    withClient(<AlertsBanner />);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark seen' }));

    await waitFor(() =>
      expect(server.markAlertsSeenFn).toHaveBeenCalledWith({ data: { alertId: 'a1' } }),
    );
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('renders nothing when every alert is seen, resolved, or there are none', async () => {
    server.listAlertsFn.mockResolvedValue(
      list([
        alert({ seenAt: '2026-11-20T06:00:00.000Z' }),
        alert({ _id: 'r1', status: 'resolved', resolvedAt: '2026-11-19T00:00:00.000Z' }),
      ]),
    );

    const { container } = withClient(<AlertsBanner />);

    await waitFor(() => expect(server.listAlertsFn).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the alerts cannot be loaded', async () => {
    server.listAlertsFn.mockRejectedValue(new Error('403'));

    const { container } = withClient(<AlertsBanner />);

    await waitFor(() => expect(server.listAlertsFn).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

describe('AlertsPage', () => {
  it('lists active and resolved alerts and runs the checks on demand', async () => {
    server.listAlertsFn.mockResolvedValue(
      list([
        alert({}),
        alert({
          _id: 'r1',
          key: 'firecrawl_credits',
          status: 'resolved',
          severity: 'warning',
          title: 'Firecrawl credits are running low',
          resolvedAt: '2026-11-19T00:00:00.000Z',
        }),
      ]),
    );
    server.checkAlertsFn.mockResolvedValue(list([]));

    withClient(<AlertsPage />);

    expect(await screen.findByText('OpenRouter is rejecting our API key')).toBeInTheDocument();
    expect(screen.getByText('Firecrawl credits are running low')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Check now' }));
    await waitFor(() => expect(server.checkAlertsFn).toHaveBeenCalled());
    expect(await screen.findByText(/No alerts/)).toBeInTheDocument();
  });
});
