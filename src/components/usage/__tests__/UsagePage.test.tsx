import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
const members = vi.hoisted(() => ({ total: 1 }));

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
  /** The server ranks members by tokens; the first ten used some, the rest none. */
  getUsageMembersFn: vi.fn(async ({ data }: { data: { limit: number; offset: number } }) => ({
    range: {},
    members: Array.from(
      { length: Math.max(0, Math.min(data.limit, members.total - data.offset)) },
      (_, index) => {
        const rank = data.offset + index;
        const totalTokens = Math.max(0, 1000 - rank * 100);
        return {
          userId: `u${rank + 1}`,
          name: rank === 0 ? 'Ada Lovelace' : `Member ${rank + 1}`,
          email: `m${rank + 1}@example.com`,
          totalTokens,
          promptTokens: totalTokens / 2,
          completionTokens: totalTokens / 2,
          eventCount: totalTokens > 0 ? 8 : 0,
          lastUsedAt: totalTokens > 0 ? '2026-09-30T10:00:00.000Z' : undefined,
        };
      },
    ),
    total: members.total,
    limit: data.limit,
    offset: data.offset,
  })),
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
const { getUsageModelsFn, getUsageMembersFn } = await import('@/server');

function lastMembersOffset(): number {
  const calls = vi.mocked(getUsageMembersFn).mock.calls;
  return (calls[calls.length - 1][0] as { data: { offset: number } }).data.offset;
}

function memberNames(): string[] {
  const table = screen.getByRole('columnheader', { name: 'com_dash_member' }).closest('table');
  return within(table as HTMLElement)
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.querySelector('td div')?.textContent ?? '');
}

function memberPager() {
  return within(screen.getByRole('navigation', { name: 'com_usage_members_pages' }));
}

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
    members.total = 1;
    vi.mocked(getUsageModelsFn).mockClear();
    vi.mocked(getUsageMembersFn).mockClear();
  });

  it('shows the UI model name rather than the provider model id', async () => {
    renderPage();

    expect(await screen.findByText('Office Assistant')).toBeInTheDocument();
    expect(screen.queryByText('claude-haiku-4-5')).not.toBeInTheDocument();
  });

  it('hides cost and provider from an institution admin', async () => {
    renderPage();

    await screen.findByText('Office Assistant');
    expect(screen.queryByRole('columnheader', { name: 'com_usage_cost' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'com_usage_provider' })).not.toBeInTheDocument();
    expect(screen.queryByText('com_usage_cost')).not.toBeInTheDocument();
  });

  it('keeps cost and provider for a platform superadmin', async () => {
    routeContext.user = { tenantId: 'tenant-a', isPlatformSuperadmin: true };
    renderPage();

    await screen.findByText('Office Assistant');
    expect(screen.getAllByRole('columnheader', { name: 'com_usage_cost' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('columnheader', { name: 'com_usage_provider' })).toBeInTheDocument();
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

    fireEvent.change(screen.getByPlaceholderText('com_usage_search'), {
      target: { value: 'office' },
    });
    await waitFor(() => expect(lastModelsOffset()).toBe(0));
  });

  it('lists members by tokens, highest first, down to members with no usage', async () => {
    members.total = 4;
    renderPage();

    await screen.findByText('Ada Lovelace');
    expect(memberNames()).toEqual(['Ada Lovelace', 'Member 2', 'Member 3', 'Member 4']);
    expect(lastMembersOffset()).toBe(0);
  });

  it('pages through every member with Previous and Next', async () => {
    members.total = 25;
    renderPage();

    await screen.findByText('Ada Lovelace');
    let pager = memberPager();
    expect(pager.getByText('com_usage_members_range')).toBeInTheDocument();
    expect(pager.getByRole('button', { name: 'com_usage_page_previous' })).toBeDisabled();
    expect(pager.getByRole('button', { name: 'com_usage_page_next' })).toBeEnabled();

    fireEvent.click(pager.getByRole('button', { name: 'com_usage_page_next' }));
    await screen.findByText('Member 11');
    expect(lastMembersOffset()).toBe(10);
    expect(memberNames()[0]).toBe('Member 11');
    pager = memberPager();
    expect(pager.getByRole('button', { name: 'com_usage_page_previous' })).toBeEnabled();
    expect(pager.getByRole('button', { name: 'com_usage_page_next' })).toBeEnabled();

    fireEvent.click(pager.getByRole('button', { name: 'com_usage_page_next' }));
    await screen.findByText('Member 25');
    expect(lastMembersOffset()).toBe(20);
    expect(memberNames()).toHaveLength(5);
    pager = memberPager();
    expect(pager.getByRole('button', { name: 'com_usage_page_next' })).toBeDisabled();
    expect(pager.getByRole('button', { name: 'com_usage_page_previous' })).toBeEnabled();

    fireEvent.click(pager.getByRole('button', { name: 'com_usage_page_previous' }));
    await screen.findByText('Member 11');
    expect(memberNames()[0]).toBe('Member 11');
  });

  it('shows members with no usage at zero on the last page', async () => {
    members.total = 12;
    renderPage();

    await screen.findByText('Ada Lovelace');
    fireEvent.click(memberPager().getByRole('button', { name: 'com_usage_page_next' }));
    const idle = (await screen.findByText('Member 12')).closest('tr') as HTMLElement;
    const cells = within(idle).getAllByRole('cell');
    expect(cells[2]).toHaveTextContent('0');
    expect(cells[3]).toHaveTextContent('0');
    expect(cells.at(-1)).toHaveTextContent('—');
  });

  it('returns members to the first page when the search changes', async () => {
    members.total = 25;
    renderPage();

    await screen.findByText('Ada Lovelace');
    fireEvent.click(memberPager().getByRole('button', { name: 'com_usage_page_next' }));
    await waitFor(() => expect(lastMembersOffset()).toBe(10));

    fireEvent.change(screen.getByPlaceholderText('com_usage_search'), {
      target: { value: 'member' },
    });
    await waitFor(() => expect(lastMembersOffset()).toBe(0));
  });

  it('disables both steps when every member fits on one page', async () => {
    members.total = 4;
    renderPage();

    await screen.findByText('Ada Lovelace');
    const pager = memberPager();
    expect(pager.getByRole('button', { name: 'com_usage_page_previous' })).toBeDisabled();
    expect(pager.getByRole('button', { name: 'com_usage_page_next' })).toBeDisabled();
  });
});
