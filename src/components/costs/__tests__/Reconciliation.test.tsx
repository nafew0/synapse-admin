import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as t from '@/types';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: React.ReactNode }) => <a>{children}</a>,
  getRouteApi: () => ({ useRouteContext: () => ({ user: { isPlatformSuperadmin: true } }) }),
}));

vi.mock('@clickhouse/click-ui', () => ({
  Icon: () => <span />,
  Pagination: () => null,
  SearchField: () => <input />,
  createToast: vi.fn(),
}));

const figure = (
  ledger: number,
  provider: number | null,
  status: t.ReconcileStatus,
): t.ReconcileFigure => ({
  ledger,
  provider,
  gap: provider === null ? null : ledger - provider,
  gapPct: provider ? (ledger - provider) / provider : null,
  status,
});

const period = (
  name: string,
  base: t.ReconcileFigure,
  days = 7,
  covered = 7,
): t.ReconcilePeriod => ({
  period: name,
  days,
  daysCovered: covered,
  ledgerAll: base.ledger,
  ...base,
});

const reconciliation = (overrides: Partial<t.Reconciliation> = {}): t.Reconciliation => ({
  range: { start: '2026-11-10', end: '2026-11-16', days: 7 },
  thresholdPct: 3,
  notes: ['OpenRouter reports by UTC day.'],
  services: [
    {
      service: 'openrouter',
      label: 'OpenRouter',
      unit: 'usd',
      source: { status: 'ok', lastRunAt: '2026-11-17T01:00:00Z' },
      usdPerUnit: null,
      total: period('range', figure(70, 69.5, 'ok')),
      weeks: [period('2026-11-09', figure(70, 69.5, 'ok'))],
      days: [{ day: '2026-11-10', ...figure(10, 10.1, 'ok') }],
      flagged: 0,
    },
    {
      service: 'firecrawl',
      label: 'Firecrawl',
      unit: 'credits',
      source: { status: 'ok', lastRunAt: '2026-11-17T01:00:00Z' },
      usdPerUnit: 0.001,
      total: period('range', figure(300, 250, 'flagged'), 7, 5),
      weeks: [period('2026-11-09', figure(300, 250, 'flagged'), 7, 5)],
      days: [
        { day: '2026-11-10', ...figure(40, 30, 'flagged') },
        { day: '2026-11-11', ...figure(40, null, 'missing_provider') },
      ],
      flagged: 1,
    },
  ],
  unstructured: [
    {
      ...period('2026-10', figure(40, null, 'missing_provider'), 0, 0),
      pages: null,
      note: null,
      enteredBy: null,
      enteredAt: null,
    },
  ],
  ...overrides,
});

const server = vi.hoisted(() => ({
  getFn: vi.fn(),
  refreshFn: vi.fn(),
  saveFn: vi.fn(),
}));

vi.mock('@/server', () => ({
  getReconciliationFn: server.getFn,
  refreshProviderFiguresFn: server.refreshFn,
  saveUnstructuredEntryFn: server.saveFn,
}));

import { createToast } from '@clickhouse/click-ui';
import '@/locales/i18n';
import { Reconciliation } from '../Reconciliation';

const renderView = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Reconciliation range={{ start: '2026-11-10', end: '2026-11-16' }} />
    </QueryClientProvider>,
  );

const card = (title: RegExp) => screen.getByRole('heading', { name: title }).closest('section')!;

describe('Reconciliation', () => {
  beforeEach(() => {
    vi.mocked(createToast).mockClear();
    server.getFn.mockReset().mockResolvedValue(reconciliation());
    server.refreshFn.mockReset().mockResolvedValue({
      results: [{ service: 'openrouter', status: 'ok', stored: 3 }],
    });
    server.saveFn.mockReset().mockResolvedValue({ month: '2026-10', amountUsd: 40 });
  });

  it('shows a within-limit service and an outside-limit service with their gaps', async () => {
    renderView();
    const openrouter = within(
      await screen.findByRole('heading', { name: /OpenRouter/ }).then((h) => h.closest('section')!),
    );
    expect(openrouter.getAllByText('Within 3%').length).toBeGreaterThan(0);
    expect(openrouter.getAllByText('$70.00').length).toBeGreaterThan(0);

    const firecrawl = within(card(/Firecrawl/));
    expect(firecrawl.getAllByText('Outside 3%').length).toBeGreaterThan(0);
    expect(firecrawl.getAllByText('+20.0%').length).toBeGreaterThan(0);
    expect(firecrawl.getAllByText('5 of 7 days')).toHaveLength(2);
    expect(firecrawl.getByText('1 days outside the limit')).toBeInTheDocument();
  });

  it('asks for the range it is given', async () => {
    renderView();
    await screen.findByRole('heading', { name: /OpenRouter/ });
    expect(server.getFn).toHaveBeenCalledWith({ data: { start: '2026-11-10', end: '2026-11-16' } });
  });

  it('shows days only on request, with missing provider data marked', async () => {
    renderView();
    const firecrawl = within(
      await screen.findByRole('heading', { name: /Firecrawl/ }).then((h) => h.closest('section')!),
    );
    expect(firecrawl.queryByText('2026-11-11')).toBeNull();
    fireEvent.click(firecrawl.getByRole('button', { name: 'Show days' }));
    expect(firecrawl.getByText('2026-11-11')).toBeInTheDocument();
    expect(firecrawl.getByText('No provider data')).toBeInTheDocument();
  });

  it('says why a provider has no figures', async () => {
    server.getFn.mockResolvedValue(
      reconciliation({
        services: [
          {
            ...reconciliation().services[0],
            source: { status: 'unreadable', message: 'needs a management key' },
            total: period('range', figure(70, null, 'missing_provider'), 7, 0),
            weeks: [period('2026-11-09', figure(70, null, 'missing_provider'), 7, 0)],
          },
        ],
      }),
    );
    renderView();
    expect(
      await screen.findByText(/Provider unreadable — needs a management key/),
    ).toBeInTheDocument();
    expect(screen.getAllByText('No provider data').length).toBeGreaterThan(0);
  });

  it('reads provider figures on request and confirms', async () => {
    renderView();
    fireEvent.click(await screen.findByRole('button', { name: 'Read provider figures now' }));
    await waitFor(() => expect(server.refreshFn).toHaveBeenCalled());
    await waitFor(() =>
      expect(createToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' })),
    );
  });

  it('reports a provider that refused the read', async () => {
    server.refreshFn.mockResolvedValue({
      results: [{ service: 'openrouter', status: 'unreadable', stored: 0, message: 'no key' }],
    });
    renderView();
    fireEvent.click(await screen.findByRole('button', { name: 'Read provider figures now' }));
    await waitFor(() =>
      expect(createToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'danger' })),
    );
  });

  it('saves the Unstructured invoice figure for a month', async () => {
    renderView();
    const unstructured = within(
      await screen
        .findByRole('heading', { name: /Unstructured/ })
        .then((h) => h.closest('section')!),
    );
    fireEvent.change(unstructured.getByLabelText('Invoice (USD)'), { target: { value: '41.5' } });
    fireEvent.change(unstructured.getByLabelText('Pages (optional)'), {
      target: { value: '1200' },
    });
    fireEvent.change(unstructured.getByLabelText('Note (optional)'), {
      target: { value: 'inv 118' },
    });
    fireEvent.click(unstructured.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(server.saveFn).toHaveBeenCalled());
    expect(server.saveFn.mock.calls[0][0].data).toEqual({
      month: '2026-10',
      amountUsd: 41.5,
      pages: 1200,
      note: 'inv 118',
    });
  });

  it('does not save without an amount', async () => {
    renderView();
    const unstructured = within(
      await screen
        .findByRole('heading', { name: /Unstructured/ })
        .then((h) => h.closest('section')!),
    );
    fireEvent.click(unstructured.getByRole('button', { name: 'Save' }));
    expect(server.saveFn).not.toHaveBeenCalled();
    expect(createToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'danger' }));
  });

  it('shows an error when the reconciliation cannot be loaded', async () => {
    server.getFn.mockRejectedValue(new Error('boom'));
    renderView();
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });
});
