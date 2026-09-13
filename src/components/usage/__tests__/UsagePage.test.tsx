import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const routeContext = {
  user: { tenantId: 'tenant-a', isPlatformSuperadmin: false } as Record<string, unknown>,
};

vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({ useRouteContext: () => routeContext }),
}));

vi.mock('@clickhouse/click-ui', () => ({
  Icon: () => <span data-testid="icon" />,
  Pagination: ({
    currentPage,
    totalPages,
    onChange,
  }: {
    currentPage: number;
    totalPages: number;
    onChange: (page: number) => void;
  }) => (
    <nav data-testid="pagination" data-current={currentPage} data-total={totalPages}>
      <button onClick={() => onChange(currentPage + 1)}>next page</button>
    </nav>
  ),
  SearchField: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  }) => (
    <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  ),
}));

vi.mock('@/hooks/useCapabilities', () => ({
  useCapabilities: () => ({ hasCapability: () => true, isLoading: false, isError: false }),
}));

const modelRow = {
  displayName: 'Office Assistant',
  modelKey: 'claude-haiku-4-5',
  totalTokens: 1000,
  promptTokens: 400,
  completionTokens: 600,
  eventCount: 8,
  memberCount: 2,
};
const models = vi.hoisted(() => ({ total: 1 }));

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
    members: [
      {
        userId: 'u1',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        totalTokens: 1000,
        promptTokens: 400,
        completionTokens: 600,
        eventCount: 8,
      },
    ],
    total: 1,
    limit: 10,
    offset: 0,
  }),
  getUsageModelsFn: vi.fn(async ({ data }: { data: { offset: number } }) => ({
    range: {},
    models: [modelRow],
    total: models.total,
    limit: 10,
    offset: data.offset,
  })),
  getUsageTimeseriesFn: vi.fn().mockResolvedValue({ range: {}, points: [] }),
  exportUsageCsvServerFn: vi.fn(),
  listPlatformInstitutionsFn: vi.fn().mockResolvedValue({ institutions: [] }),
}));

const { UsagePage } = await import('../UsagePage');
const { getUsageModelsFn } = await import('@/server');

function lastModelsOffset(): number {
  const calls = vi.mocked(getUsageModelsFn).mock.calls;
  return (calls[calls.length - 1][0] as { data: { offset: number } }).data.offset;
}

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
    models.total = 1;
    vi.mocked(getUsageModelsFn).mockClear();
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

  it('shows no pagination when every model fits on one page', async () => {
    renderPage();

    await screen.findByText('Office Assistant');
    expect(screen.queryByTestId('pagination')).not.toBeInTheDocument();
  });

  it('pages through models beyond the first ten', async () => {
    models.total = 23;
    renderPage();

    const pagination = await screen.findByTestId('pagination');
    expect(pagination).toHaveAttribute('data-total', '3');
    expect(lastModelsOffset()).toBe(0);

    fireEvent.click(screen.getByText('next page'));
    await waitFor(() => expect(lastModelsOffset()).toBe(10));
  });

  it('returns to the first page when the search changes', async () => {
    models.total = 23;
    renderPage();

    await screen.findByTestId('pagination');
    fireEvent.click(screen.getByText('next page'));
    await waitFor(() => expect(lastModelsOffset()).toBe(10));

    fireEvent.change(screen.getByPlaceholderText('Search members or models'), {
      target: { value: 'office' },
    });
    await waitFor(() => expect(lastModelsOffset()).toBe(0));
  });
});
