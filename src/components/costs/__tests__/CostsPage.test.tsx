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

const figures = (costUsd: number, extra: Partial<t.CostFigures> = {}): t.CostFigures => ({
  ledgerUsd: costUsd,
  feeUsd: 0,
  costUsd,
  costBdt: costUsd * 120,
  billableUsd: costUsd * 0.8,
  platformUsd: costUsd * 0.2,
  requests: 10,
  units: 1000,
  pages: 0,
  inputTokens: 0,
  outputTokens: 0,
  ...extra,
});

const range: t.CostRange = {
  start: '2026-11-01',
  end: '2026-11-03',
  days: 3,
  timezone: 'Asia/Dhaka',
  bdtPerUsd: 120,
  providerFeePercent: 5.5,
};

const summary: t.CostSummary = {
  range,
  current: {
    cost: figures(100),
    byService: { openrouter: 90, unstructured: 10 },
    activeUsers: 8,
    costPerActiveUser: 12.5,
  },
  previous: {
    range: { start: '2026-10-29', end: '2026-10-31', days: 3 },
    cost: figures(80),
    byService: {},
    activeUsers: 6,
    costPerActiveUser: 13.33,
  },
  change: { costUsd: 0.25, activeUsers: 0.3333, costPerActiveUser: -0.0625 },
  fixed: {
    items: [
      { id: 'a', label: 'Servers', amount: 50, currency: 'USD', monthlyUsd: 50, periodUsd: 5 },
    ],
    periodUsd: 5,
    periodBdt: 600,
  },
  grandTotal: { usd: 105, bdt: 12600 },
};

const institutionRow = (
  tenantId: string,
  name: string,
  kind: t.CostTenantKind,
  costUsd: number,
): t.CostInstitutionRow => ({
  tenantId,
  name,
  kind,
  cost: figures(costUsd),
  byService: { openrouter: costUsd },
  activeMembers: 4,
  costPerActiveMember: costUsd / 4,
  topModel: 'claude-haiku',
  previousCostUsd: costUsd / 2,
  changeVsPrevious: 1,
  shareOfTotal: costUsd / 100,
});

const server = vi.hoisted(() => ({
  exportFn: vi.fn(),
  saveFn: vi.fn(),
  institutionFn: vi.fn(),
}));

vi.mock('@/server', () => ({
  listKbStorageFn: vi.fn(async () => ({
    days: 90,
    measuredAt: '2026-11-21T00:00:00.000Z',
    limitBytes: null,
    totals: {
      documents: 0,
      versions: 0,
      originalBytes: 0,
      parsedBytes: 0,
      indexChunks: 0,
      totalBytes: 0,
    },
    institutions: [],
  })),
  getCostSummaryFn: vi.fn(async () => summary),
  getCostInstitutionsFn: vi.fn(async () => ({
    range,
    institutions: [
      institutionRow('t-a', 'Alpha University', 'institution', 60),
      institutionRow('__individuals__', 'Individuals', 'individuals', 30),
      institutionRow('__platform__', 'Platform / unattributed', 'platform', 10),
    ],
  })),
  getCostServicesFn: vi.fn(async () => ({
    range,
    services: [
      {
        service: 'openrouter',
        ...figures(90),
        topInstitutions: [{ tenantId: 't-a', name: 'Alpha University', costUsd: 60, units: 5 }],
      },
      { service: 'unstructured', ...figures(10, { units: 42 }), topInstitutions: [] },
      { service: 'stt', ...figures(0.5, { units: 600 }), topInstitutions: [] },
    ],
  })),
  getCostTimeseriesFn: vi.fn(async () => ({
    range,
    groupBy: 'service',
    days: ['2026-11-01', '2026-11-02', '2026-11-03'],
    series: [
      { key: 'openrouter', label: 'openrouter', values: [10, 20, 60], totalUsd: 90 },
      { key: 'unstructured', label: 'unstructured', values: [1, 2, 7], totalUsd: 10 },
    ],
  })),
  getCostInstitutionFn: server.institutionFn,
  getCostRequestsFn: vi.fn(async () => ({
    range,
    next: null,
    requests: [
      {
        id: 'r1',
        createdAt: '2026-11-02T10:00:00Z',
        user: 'u1',
        tenantId: 't-a',
        conversationId: 'conv-cheap',
        messageId: null,
        service: 'openrouter',
        model: 'm',
        usageKind: null,
        taskType: null,
        billable: true,
        tokenType: null,
        units: 1,
        pages: 0,
        ledgerUsd: 0.01,
      },
      {
        id: 'r2',
        createdAt: '2026-11-02T11:00:00Z',
        user: 'u1',
        tenantId: 't-a',
        conversationId: 'conv-dear',
        messageId: null,
        service: 'openrouter',
        model: 'm',
        usageKind: null,
        taskType: 'word',
        billable: true,
        tokenType: null,
        units: 1,
        pages: 0,
        ledgerUsd: 2.5,
      },
    ],
  })),
  getCostSettingsFn: vi.fn(async () => ({
    settings: {
      bdtPerUsd: 120,
      providerFeePercent: 5.5,
      configured: true,
      fixedCosts: [{ id: 'a', label: 'Servers', amount: 50, currency: 'USD' }],
      updatedAt: '2026-11-01T00:00:00Z',
    },
  })),
  updateCostSettingsFn: server.saveFn,
  exportCostCsvFn: server.exportFn,
}));

vi.mock('@/utils/download', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/download')>()),
  downloadBlob: vi.fn(),
}));

import { createToast } from '@clickhouse/click-ui';
import '@/locales/i18n';
import { CostsPage } from '../CostsPage';

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <CostsPage />
    </QueryClientProvider>,
  );

describe('CostsPage', () => {
  beforeEach(() => {
    server.exportFn
      .mockReset()
      .mockResolvedValue(
        new Response('a,b', { headers: { 'Content-Disposition': 'attachment; filename="x.csv"' } }),
      );
    server.saveFn.mockReset().mockResolvedValue({ settings: {} });
    server.institutionFn.mockReset().mockResolvedValue({
      range,
      tenantId: 't-a',
      name: 'Alpha University',
      cost: figures(60),
      activeMembers: 4,
      byService: { openrouter: 55, unstructured: 5 },
      byModel: [{ service: 'openrouter', model: 'claude-haiku', ...figures(55) }],
      byMember: [
        {
          user: 'u1',
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          tenantId: 't-a',
          ...figures(30),
          byService: { openrouter: 30 },
        },
      ],
      byDay: [{ day: '2026-11-02', ...figures(20) }],
    });
  });

  it('shows the total in taka and dollars with the change against the previous period', async () => {
    renderPage();
    expect((await screen.findAllByText('৳12,000')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\$100\.00/).length).toBeGreaterThan(0);
    expect(screen.getByText(/25% vs previous 3 days/)).toBeInTheDocument();
  });

  it('lists every service with its units and cost, counting OCR once', async () => {
    renderPage();
    const table = (await screen.findByText('Document OCR (Unstructured)')).closest('table');
    expect(table).not.toBeNull();
    const rows = within(table as HTMLElement);
    expect(rows.getByText('Models and images (OpenRouter)')).toBeInTheDocument();
    expect(rows.getByText('Voice input')).toBeInTheDocument();
    const ocrRow = rows.getByText('Document OCR (Unstructured)').closest('tr') as HTMLElement;
    expect(within(ocrRow).getByText('42')).toBeInTheDocument();
    expect(within(ocrRow).getByText('pages')).toBeInTheDocument();
    expect(rows.getAllByText('min').length).toBe(1);
    expect(within(ocrRow).getByText('৳1,200')).toBeInTheDocument();
  });

  it('lists institutions, Individuals and Platform rows', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: 'Alpha University' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Individuals' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Platform / unattributed' })).toBeInTheDocument();
  });

  it('adds the fixed costs to the variable cost for a grand total', async () => {
    renderPage();
    expect(await screen.findByText('Grand total')).toBeInTheDocument();
    expect(screen.getByText('৳12,600')).toBeInTheDocument();
    expect(screen.getByText(/Servers/, { selector: 'dt' })).toBeInTheDocument();
  });

  it('opens an institution cost view with its costliest request first', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Alpha University' }));
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(server.institutionFn).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tenantId: 't-a' }) }),
    );
    const conversations = await screen.findAllByText(/^conv-/);
    expect(conversations.map((cell) => cell.textContent)).toEqual(['conv-dear', 'conv-cheap']);
    fireEvent.click(screen.getByRole('button', { name: 'All costs' }));
    expect(await screen.findByText('Grand total')).toBeInTheDocument();
  });

  it('saves the rate, fee and fixed costs', async () => {
    renderPage();
    const rate = await screen.findByLabelText('Taka per US dollar');
    fireEvent.change(rate, { target: { value: '125' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add a fixed cost' }));
    const names = screen.getAllByLabelText('Name');
    fireEvent.change(names[names.length - 1], { target: { value: 'Langfuse host' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(server.saveFn).toHaveBeenCalled());
    await waitFor(() => expect(createToast).toHaveBeenCalled());
    const sent = server.saveFn.mock.calls[0][0].data;
    expect(sent.bdtPerUsd).toBe(125);
    expect(sent.providerFeePercent).toBe(5.5);
    expect(sent.fixedCosts.map((item: t.FixedCostItem) => item.label)).toEqual([
      'Servers',
      'Langfuse host',
    ]);
  });

  it('exports the chosen sheet for the shown period', async () => {
    renderPage();
    fireEvent.change(await screen.findByLabelText('Sheet'), { target: { value: 'members' } });
    fireEvent.click(screen.getByRole('button', { name: /Export CSV/ }));
    await waitFor(() => expect(server.exportFn).toHaveBeenCalled());
    expect(server.exportFn.mock.calls[0][0].data.sheet).toBe('members');
  });
});
