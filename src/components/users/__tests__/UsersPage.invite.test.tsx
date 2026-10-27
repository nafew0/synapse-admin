import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

const caps = vi.hoisted(() => ({ manage: true }));

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
  SearchField: () => <input />,
}));

vi.mock('@/hooks/useCapabilities', () => ({
  useCapabilities: () => ({
    hasCapability: (capability: string) => capability !== 'manage:users' || caps.manage,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('../CreateUserDialog', () => ({
  CreateUserDialog: ({ open }: { open: boolean }) => (open ? <div role="dialog">invite form</div> : null),
}));
vi.mock('../ImportMembersDialog', () => ({ ImportMembersDialog: () => null }));
vi.mock('../MemberPanel', () => ({ MemberPanel: () => null }));
vi.mock('../ResendInvitesDialog', () => ({ ResendInvitesDialog: () => null }));
vi.mock('../../access', () => ({ ConfirmDialog: () => null }));

vi.mock('@/server', () => ({
  getMembersFn: vi.fn().mockResolvedValue({
    members: [],
    summary: { activeMembers: 0, maxActiveMembers: null, pendingInvites: 0, institutions: 1 },
    total: 0,
    limit: 25,
    offset: 0,
  }),
  exportMembersFn: vi.fn(),
  listPlatformInstitutionsFn: vi.fn().mockResolvedValue({ institutions: [] }),
  removeMemberFn: vi.fn(),
  suspendMemberFn: vi.fn(),
}));

const { UsersPage } = await import('../UsersPage');
const { SystemCapabilities } = await import('@/constants');

function renderPage(props: { openInvite?: boolean; onInviteHandled?: () => void }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <UsersPage {...props} />
    </QueryClientProvider>,
  );
}

describe('UsersPage arriving from the Dashboard invite button', () => {
  it('uses the real capability name in this test', () => {
    expect(SystemCapabilities.MANAGE_USERS).toBe('manage:users');
  });

  it('opens the invite form once the page has loaded, and clears the request', async () => {
    caps.manage = true;
    const onInviteHandled = vi.fn();
    renderPage({ openInvite: true, onInviteHandled });

    expect(await screen.findByRole('dialog')).toHaveTextContent('invite form');
    expect(onInviteHandled).toHaveBeenCalledTimes(1);
  });

  it('stays closed on a normal visit', async () => {
    caps.manage = true;
    renderPage({});
    expect(await screen.findByText('com_users_invite_member')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not open the form for someone who cannot invite, but still clears the request', async () => {
    caps.manage = false;
    const onInviteHandled = vi.fn();
    renderPage({ openInvite: true, onInviteHandled });
    expect(await screen.findByText('com_users_invite_member')).toBeInTheDocument();

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onInviteHandled).toHaveBeenCalledTimes(1);
  });
});
