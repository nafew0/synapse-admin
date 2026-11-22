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
  IconButton: ({ onClick, ...rest }: { onClick?: () => void; 'aria-label'?: string }) => (
    <button type="button" aria-label={rest['aria-label']} onClick={onClick} />
  ),
  Button: ({
    label,
    onClick,
    disabled,
  }: {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type={onClick ? 'button' : 'submit'} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  ),
  Dialog: Object.assign(
    ({ open, children }: { open: boolean; children: React.ReactNode }) =>
      open ? <div>{children}</div> : null,
    {
      Content: ({ title, children }: { title: string; children: React.ReactNode }) => (
        <div role="dialog" aria-label={title}>
          {children}
        </div>
      ),
    },
  ),
  createToast: vi.fn(),
}));

const server = vi.hoisted(() => ({
  list: vi.fn(),
  notices: vi.fn(),
  detail: vi.fn(),
  diff: vi.fn(),
  seen: vi.fn(),
  sync: vi.fn(),
  setOverride: vi.fn(),
  clearOverride: vi.fn(),
  settings: vi.fn(),
}));

vi.mock('@/server', () => ({
  getModelPricesFn: server.list,
  getPriceNoticesFn: server.notices,
  getModelPriceFn: server.detail,
  getPriceDiffFn: server.diff,
  markPriceNoticeSeenFn: server.seen,
  syncModelPricesFn: server.sync,
  setPriceOverrideFn: server.setOverride,
  clearPriceOverrideFn: server.clearOverride,
  getCostSettingsFn: server.settings,
}));

import { createToast } from '@clickhouse/click-ui';
import '@/locales/i18n';
import { PricesPage } from '../PricesPage';

const price = (overrides: Partial<t.PriceBlock> = {}): t.PriceBlock => ({
  prompt: 0.75,
  completion: 4.125,
  cacheRead: 0.075,
  cacheWrite: 0.9,
  contextLength: 1_000_000,
  tiers: [],
  ...overrides,
});

const row = (overrides: Partial<t.ModelPriceRow> = {}): t.ModelPriceRow => ({
  modelId: 'anthropic/claude-haiku-5.5',
  name: 'Claude Haiku 5.5',
  kind: 'chat',
  usedFor: ['endpoint:OpenRouter', 'spec:office-assistant'],
  status: 'changed',
  source: 'openrouter',
  price: price(),
  syncedPrice: price(),
  override: null,
  longPrompt: '×5 above 100,000 tokens',
  contextLength: 1_000_000,
  fetchedAt: '2026-11-19T14:00:00Z',
  lastChangedAt: '2026-11-19T14:00:00Z',
  version: 2,
  unpricedHits: 0,
  ...overrides,
});

const sync = (overrides: Partial<t.PriceSyncRun> = {}): t.PriceSyncRun => ({
  trigger: 'timer',
  startedAt: '2026-11-19T14:00:00Z',
  ok: true,
  models: 12,
  changed: 1,
  notListed: 0,
  unpriced: 0,
  ...overrides,
});

const list = (overrides: Partial<t.ModelPriceList> = {}): t.ModelPriceList => ({
  lastSync: sync(),
  lastSuccessfulSync: sync(),
  warnings: { noPrice: 0, notListed: 0, syncFailingOver24h: false },
  unseenNotices: 1,
  models: [
    row(),
    row({
      modelId: 'x-ai/grok-9',
      name: 'Grok 9',
      status: 'no_price',
      price: null,
      syncedPrice: null,
      source: null,
      usedFor: ['ledger'],
      longPrompt: null,
      lastChangedAt: null,
      version: 1,
    }),
  ],
  ...overrides,
});

const diffLine = (overrides: Partial<t.PriceDiffLine>): t.PriceDiffLine => ({
  field: 'completion',
  previous: 3.75,
  current: 4.125,
  change: 0.375,
  changePct: 10,
  kind: 'changed',
  ...overrides,
});

const notice: t.PriceNotice = {
  _id: 'n1',
  modelId: 'anthropic/claude-haiku-5.5',
  kind: 'price_changed',
  summary: 'Claude Haiku 5.5: output $3.75 → $4.125 per 1M (+10%)',
  diff: [diffLine({})],
  seenAt: null,
  createdAt: '2026-11-19T14:00:00Z',
};

const detail = (overrides: Partial<t.ModelPriceDetail> = {}): t.ModelPriceDetail => ({
  model: row(),
  lastChange: [
    diffLine({}),
    diffLine({
      field: 'prompt',
      previous: 0.75,
      current: 0.75,
      change: 0,
      changePct: 0,
      kind: 'unchanged',
    }),
    diffLine({
      field: 'tier:100000:completion',
      previous: null,
      current: 20,
      change: null,
      changePct: null,
      kind: 'added',
    }),
  ],
  biggestChangePct: 10,
  versions: [
    {
      modelId: 'anthropic/claude-haiku-5.5',
      version: 2,
      effectiveFrom: '2026-11-19T14:00:00Z',
      source: 'sync',
      priceSource: 'openrouter',
      price: price(),
      previous: price({ completion: 3.75 }),
      diff: [],
    },
    {
      modelId: 'anthropic/claude-haiku-5.5',
      version: 1,
      effectiveFrom: '2026-11-01T09:00:00Z',
      source: 'sync',
      priceSource: 'openrouter',
      price: price({ completion: 3.75 }),
      previous: null,
      diff: [],
    },
  ],
  costEffect: {
    windowDays: 30,
    calls: 1200,
    truncated: false,
    recordedUsd: 24.48,
    atPreviousUsd: 24.48,
    atCurrentUsd: 27.1,
    differenceUsd: 2.62,
  },
  ...overrides,
});

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PricesPage />
    </QueryClientProvider>,
  );

describe('PricesPage', () => {
  beforeEach(() => {
    vi.mocked(createToast).mockClear();
    server.list.mockReset().mockResolvedValue(list());
    server.notices.mockReset().mockResolvedValue([notice]);
    server.detail.mockReset().mockResolvedValue(detail());
    server.diff
      .mockReset()
      .mockResolvedValue({ modelId: 'x', from: 1, to: 2, diff: [diffLine({})] });
    server.seen.mockReset().mockResolvedValue({});
    server.sync
      .mockReset()
      .mockResolvedValue({ ok: true, result: { ok: true, models: 12, changed: 2, notListed: 0 } });
    server.setOverride.mockReset().mockResolvedValue({ model: row() });
    server.clearOverride.mockReset().mockResolvedValue({ model: row() });
    server.settings.mockReset().mockResolvedValue({ settings: { bdtPerUsd: 120 } });
  });

  it('shows a loading state, then the models with status badges', async () => {
    renderPage();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(await screen.findByText('Claude Haiku 5.5')).toBeInTheDocument();
    expect(screen.getByText('Grok 9')).toBeInTheDocument();
    const table = within(screen.getByRole('table'));
    expect(table.getByText('Changed')).toHaveAttribute('data-status', 'changed');
    expect(table.getByText('No price')).toHaveAttribute('data-status', 'no_price');
    expect(screen.getByText('×5 above 100,000 tokens')).toBeInTheDocument();
    expect(screen.getByText(/Synced .* 12 models, 1 changed/)).toBeInTheDocument();
  });

  it('shows warnings for unpriced and unlisted models and a failing sync', async () => {
    server.list.mockResolvedValue(
      list({ warnings: { noPrice: 1, notListed: 2, syncFailingOver24h: true } }),
    );
    renderPage();
    expect(await screen.findByText(/1 model\(s\) in use have no price/)).toBeInTheDocument();
    expect(screen.getByText(/2 model\(s\) are no longer listed/)).toBeInTheDocument();
    expect(screen.getByText(/failing for over 24 hours/)).toBeInTheDocument();
  });

  it('shows an error state when the list fails', async () => {
    server.list.mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });

  it('shows the access message for a forbidden response', async () => {
    server.list.mockRejectedValue(new Error('Forbidden'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(/access/i);
    expect(screen.queryByText('Claude Haiku 5.5')).not.toBeInTheDocument();
  });

  it('shows an empty state when no model matches', async () => {
    server.list.mockResolvedValue(list({ models: [] }));
    renderPage();
    expect(await screen.findByText('No models match these filters.')).toBeInTheDocument();
  });

  it('passes the filters to the server', async () => {
    renderPage();
    await screen.findByText('Claude Haiku 5.5');
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'no_price' } });
    await waitFor(() =>
      expect(server.list).toHaveBeenLastCalledWith({
        data: { changedDays: 7, status: 'no_price' },
      }),
    );
  });

  it('marks a notice seen', async () => {
    renderPage();
    const region = await screen.findByRole('region', { name: 'Price changes to review' });
    expect(within(region).getByText(/output \$3.75 → \$4.125/)).toBeInTheDocument();
    fireEvent.click(within(region).getByRole('button', { name: 'Mark seen' }));
    await waitFor(() => expect(server.seen).toHaveBeenCalledWith({ data: { id: 'n1' } }));
  });

  it('runs a sync and reports the result', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Sync now/ }));
    await waitFor(() => expect(server.sync).toHaveBeenCalled());
    await waitFor(() =>
      expect(createToast).toHaveBeenCalledWith({
        type: 'success',
        title: 'Prices synced: 12 models, 2 changed.',
      }),
    );
  });

  it('reports a failed sync and a busy one in plain words', async () => {
    server.sync.mockResolvedValueOnce({ ok: false, reason: 'failed', message: '' });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Sync now/ }));
    await waitFor(() =>
      expect(createToast).toHaveBeenCalledWith({
        type: 'danger',
        title: 'OpenRouter could not be reached. The last prices are kept.',
      }),
    );
    server.sync.mockResolvedValueOnce({
      ok: false,
      reason: 'failed',
      message: 'OpenRouter /models answered 500',
    });
    fireEvent.click(screen.getByRole('button', { name: /Sync now/ }));
    await waitFor(() =>
      expect(createToast).toHaveBeenCalledWith({
        type: 'danger',
        title: 'Price sync failed: OpenRouter /models answered 500. The last prices are kept.',
      }),
    );
    server.sync.mockResolvedValueOnce({ ok: false, reason: 'busy', message: '' });
    fireEvent.click(screen.getByRole('button', { name: /Sync now/ }));
    await waitFor(() =>
      expect(createToast).toHaveBeenCalledWith({
        type: 'danger',
        title: 'Another server is already syncing. Try again in a minute.',
      }),
    );
  });

  it('opens the drawer with the diff, hiding unchanged fields until asked', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Open Claude Haiku 5.5' }));
    const drawer = await screen.findByRole('dialog');
    expect(server.detail).toHaveBeenCalledWith({ data: { modelId: 'anthropic/claude-haiku-5.5' } });
    expect(await within(drawer).findByText('+$0.375 (+10.0%)')).toBeInTheDocument();
    expect(within(drawer).getByText('Output above 100K tokens')).toBeInTheDocument();
    expect(within(drawer).getByText('added')).toBeInTheDocument();
    expect(within(drawer).queryByText('0.0%')).not.toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Show unchanged fields' }));
    expect(
      within(drawer)
        .getAllByRole('row')
        .some((tr) => tr.getAttribute('data-kind') === 'unchanged'),
    ).toBe(true);
    expect(
      within(drawer).getByText(/would have cost \$27.10 instead of \$24.48 \(\+\$2.62\)/),
    ).toBeInTheDocument();
  });

  it('says first price recorded for a model with one version', async () => {
    server.detail.mockResolvedValue(
      detail({ versions: [{ ...detail().versions[1] }], lastChange: [] }),
    );
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Open Claude Haiku 5.5' }));
    expect(await screen.findByText('First price recorded.')).toBeInTheDocument();
  });

  it('shows an error in the drawer when the detail fails', async () => {
    server.detail.mockRejectedValue(new Error('detail down'));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Open Claude Haiku 5.5' }));
    expect(await screen.findByText('detail down')).toBeInTheDocument();
  });

  it('compares two picked versions', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Open Claude Haiku 5.5' }));
    const drawer = await screen.findByRole('dialog');
    fireEvent.change(await within(drawer).findByLabelText('From'), { target: { value: '1' } });
    fireEvent.change(within(drawer).getByLabelText('To'), { target: { value: '2' } });
    await waitFor(() =>
      expect(server.diff).toHaveBeenCalledWith({
        data: { modelId: 'anthropic/claude-haiku-5.5', from: 1, to: 2 },
      }),
    );
  });

  it('sets a manual price with a reason', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Open Claude Haiku 5.5' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Set manual price' }));
    const form = screen.getByRole('dialog', { name: /Manual price: Claude Haiku 5.5/ });
    fireEvent.change(within(form).getByLabelText('Output'), { target: { value: '3.5' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Save manual price' }));
    expect(await within(form).findByRole('alert')).toHaveTextContent('Give a reason');
    expect(server.setOverride).not.toHaveBeenCalled();
    fireEvent.change(within(form).getByLabelText('Reason (required)'), {
      target: { value: 'Negotiated rate' },
    });
    fireEvent.click(within(form).getByRole('button', { name: 'Save manual price' }));
    await waitFor(() => expect(server.setOverride).toHaveBeenCalled());
    const { data } = server.setOverride.mock.calls[0][0];
    expect(data).toMatchObject({
      modelId: 'anthropic/claude-haiku-5.5',
      reason: 'Negotiated rate',
      until: null,
      price: { prompt: 0.75, completion: 3.5, cacheRead: 0.075, cacheWrite: 0.9 },
    });
  });

  it('shows a server error from saving the manual price', async () => {
    server.setOverride.mockRejectedValue(new Error('until must be in the future'));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Open Claude Haiku 5.5' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Set manual price' }));
    const form = screen.getByRole('dialog', { name: /Manual price/ });
    fireEvent.change(within(form).getByLabelText('Reason (required)'), {
      target: { value: 'deal' },
    });
    fireEvent.click(within(form).getByRole('button', { name: 'Save manual price' }));
    expect(await within(form).findByRole('alert')).toHaveTextContent('until must be in the future');
  });

  it('clears an active manual price', async () => {
    const manual = row({
      source: 'manual',
      override: {
        reason: 'Negotiated rate',
        setBy: '65f0c0ffee0000000000abcd',
        setByName: 'Ada Admin',
        setAt: '2026-11-18T10:00:00Z',
        until: null,
      },
    });
    server.list.mockResolvedValue(list({ models: [manual] }));
    server.detail.mockResolvedValue(detail({ model: manual }));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Open Claude Haiku 5.5' }));
    expect(await screen.findByText('Negotiated rate')).toBeInTheDocument();
    expect(screen.getAllByText(/Ada Admin/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/65f0c0ffee/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove manual price' }));
    await waitFor(() =>
      expect(server.clearOverride).toHaveBeenCalledWith({
        data: { modelId: 'anthropic/claude-haiku-5.5' },
      }),
    );
  });
});
