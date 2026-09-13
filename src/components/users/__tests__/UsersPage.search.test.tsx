import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({
    useRouteContext: () => ({ user: { tenantId: 'tenant-a', isPlatformSuperadmin: false } }),
  }),
}));

vi.mock('@clickhouse/click-ui', () => ({
  Button: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  Icon: () => <span />,
  Pagination: () => null,
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

vi.mock('../CreateUserDialog', () => ({ CreateUserDialog: () => null }));
vi.mock('../ImportMembersDialog', () => ({ ImportMembersDialog: () => null }));
vi.mock('../UserDetailDialog', () => ({ UserDetailDialog: () => null }));
vi.mock('../../access', () => ({ ConfirmDialog: () => null }));

const pending = vi.hoisted(() => ({ release: [] as Array<() => void> }));

vi.mock('@/server', () => ({
  getMembersFn: vi.fn(
    ({ data }: { data: { query: string } }) =>
      new Promise((resolve) => {
        const respond = () =>
          resolve({
            members: [
              {
                id: `row-${data.query || 'all'}`,
                name: data.query ? `Match ${data.query}` : 'Ada Lovelace',
                email: 'ada@example.com',
                role: 'INSTITUTION_MEMBER',
                status: 'active',
              },
            ],
            summary: {
              activeMembers: 1,
              maxActiveMembers: null,
              pendingInvites: 0,
              institutions: 1,
            },
            total: 1,
            limit: 25,
            offset: 0,
          });
        if (!data.query) {
          respond();
          return;
        }
        pending.release.push(respond);
      }),
  ),
  exportMembersFn: vi.fn(),
  listPlatformInstitutionsFn: vi.fn().mockResolvedValue({ institutions: [] }),
  removeMemberFn: vi.fn(),
  suspendMemberFn: vi.fn(),
}));

const { UsersPage } = await import('../UsersPage');
const { getMembersFn } = await import('@/server');

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <UsersPage />
    </QueryClientProvider>,
  );
}

describe('UsersPage search', () => {
  beforeEach(() => {
    pending.release = [];
    vi.mocked(getMembersFn).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the search box mounted and focused while the next result loads', async () => {
    renderPage();
    const input = await screen.findByPlaceholderText('Search members');

    vi.useFakeTimers();
    input.focus();
    fireEvent.change(input, { target: { value: 'a' } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(pending.release).toHaveLength(1);
    expect(screen.getByPlaceholderText('Search members')).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input).toHaveValue('a');
  });

  it('queries once per settled search, not once per letter', async () => {
    renderPage();
    const input = await screen.findByPlaceholderText('Search members');
    const initialCalls = vi.mocked(getMembersFn).mock.calls.length;

    vi.useFakeTimers();
    for (const value of ['a', 'ad', 'ada']) {
      fireEvent.change(input, { target: { value } });
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
    }
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    const searchCalls = vi.mocked(getMembersFn).mock.calls.slice(initialCalls);
    expect(searchCalls).toHaveLength(1);
    expect((searchCalls[0][0] as { data: { query: string } }).data.query).toBe('ada');
  });
});
