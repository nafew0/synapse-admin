import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const routeContext = { user: { tenantId: 'tenant-a', isPlatformSuperadmin: false } as Record<string, unknown> };

vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({ useRouteContext: () => routeContext }),
}));

vi.mock('@clickhouse/click-ui', () => ({
  Icon: () => <span data-testid="icon" />,
  SearchField: ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  ),
}));

vi.mock('@/hooks/useCapabilities', () => ({
  useCapabilities: () => ({ hasCapability: () => true, isLoading: false, isError: false }),
}));

vi.mock('@/server', () => ({
  getUsageSummaryFn: vi.fn().mockResolvedValue({
    range: { start: '2026-09-01', end: '2026-10-01' },
    summary: {
      promptTokens: 400,
      completionTokens: 600,
      totalTokens: 1000,
      eventCount: 8,
      memberCount: 2,
      modelCount: 1,
    },
  }),
  getUsageMembersFn: vi.fn().mockResolvedValue({
    range: {},
    members: [{ userId: 'u1', name: 'Ada Lovelace', email: 'ada@example.com', totalTokens: 1000, promptTokens: 400, completionTokens: 600, eventCount: 8 }],
    total: 1,
    limit: 10,
    offset: 0,
  }),
  getUsageModelsFn: vi.fn().mockResolvedValue({
    range: {},
    models: [{ displayName: 'Office Assistant', modelKey: 'claude-haiku-4-5', totalTokens: 1000, promptTokens: 400, completionTokens: 600, eventCount: 8, memberCount: 2 }],
    total: 1,
    limit: 10,
    offset: 0,
  }),
  getUsageTimeseriesFn: vi.fn().mockResolvedValue({ range: {}, points: [] }),
  exportUsageCsvServerFn: vi.fn(),
  listPlatformInstitutionsFn: vi.fn().mockResolvedValue({ institutions: [] }),
}));

const { UsagePage } = await import('../UsagePage');

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <UsagePage />
    </QueryClientProvider>,
  );
}

describe('UsagePage', () => {
  beforeEach(() => {
    routeContext.user = { tenantId: 'tenant-a', isPlatformSuperadmin: false };
  });

  it('shows the UI model name rather than the provider model id', async () => {
    renderPage();

    expect(await screen.findByText('Office Assistant')).toBeInTheDocument();
    expect(screen.queryByText('claude-haiku-4-5')).not.toBeInTheDocument();
  });

  it('hides cost and provider from an institution admin', async () => {
    renderPage();

    await screen.findByText('Office Assistant');
    expect(screen.queryByRole('columnheader', { name: 'Cost' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Provider' })).not.toBeInTheDocument();
    expect(screen.queryByText('Usage cost')).not.toBeInTheDocument();
  });

  it('keeps cost and provider for a platform superadmin', async () => {
    routeContext.user = { tenantId: 'tenant-a', isPlatformSuperadmin: true };
    renderPage();

    await screen.findByText('Office Assistant');
    expect(screen.getAllByRole('columnheader', { name: 'Cost' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('columnheader', { name: 'Provider' })).toBeInTheDocument();
  });
});
