import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import type * as t from '@/types';

vi.mock('@clickhouse/click-ui', () => ({
  createToast: vi.fn(),
  Icon: () => <span />,
  IconButton: ({
    onClick,
    disabled,
    'aria-label': ariaLabel,
  }: {
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    'aria-label'?: string;
  }) => <button aria-label={ariaLabel} disabled={disabled} onClick={onClick} />,
  Pagination: () => null,
  ConfirmationDialog: () => null,
  Avatar: () => <span />,
  SearchField: ({ placeholder }: { placeholder?: string }) => <input placeholder={placeholder} />,
  Button: ({
    label,
    onClick,
    disabled,
  }: {
    label?: string;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {label}
    </button>
  ),
  Dialog: Object.assign(
    ({ open, children }: { open: boolean; children: React.ReactNode }) =>
      open ? <div role="dialog">{children}</div> : null,
    {
      Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    },
  ),
  Tabs: Object.assign(({ children }: { children: React.ReactNode }) => <div>{children}</div>, {
    TriggersList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Trigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
    Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  }),
}));

vi.mock('@/hooks/useCapabilities', () => ({
  useCapabilities: () => ({ hasCapability: () => true, isLoading: false, isError: false }),
}));

const groups: t.AccessGroup[] = [
  {
    id: 'managed-1',
    name: 'All active members',
    description: 'Tenant audience',
    memberCount: 2,
    topMembers: [],
    isActive: true,
    managedKind: 'tenant_all_active_members',
  },
  {
    id: 'local-1',
    name: 'Faculty',
    description: '',
    memberCount: 1,
    topMembers: [],
    isActive: true,
  },
];

const members = [{ userId: 'user-1', name: 'Ada', email: 'ada@example.com' }];

vi.mock('@/server', () => ({
  GROUPS_PAGE_SIZE: 50,
  MEMBERS_PAGE_SIZE: 50,
  groupsQueryOptions: () => ({
    queryKey: ['groups'],
    queryFn: () => Promise.resolve({ groups, total: groups.length }),
  }),
  groupMembersQueryOptions: (groupId: string) => ({
    queryKey: ['groupMembers', groupId],
    queryFn: () => Promise.resolve({ members, total: members.length }),
  }),
  deleteGroupFn: vi.fn(),
  updateGroupFn: vi.fn(),
  addGroupMemberFn: vi.fn(),
  removeGroupMemberFn: vi.fn(),
  searchUsersFn: vi.fn().mockResolvedValue({ users: [] }),
}));

const { GroupsTab } = await import('../GroupsTab');

function renderTab() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <GroupsTab onCreateGroup={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('managed groups', () => {
  it('badges a managed group and offers no delete action for it', async () => {
    renderTab();

    await screen.findByText('All active members');
    expect(screen.getAllByText('com_access_group_managed_badge')).toHaveLength(1);
    expect(screen.queryByLabelText('com_ui_delete All active members')).not.toBeInTheDocument();
    expect(screen.getByLabelText('com_ui_delete Faculty')).toBeInTheDocument();
  });

  it('opens a managed group read-only without member add or remove controls', async () => {
    renderTab();

    fireEvent.click(await screen.findByText('All active members'));
    const dialog = await screen.findByRole('dialog');

    await within(dialog).findByText('Ada');
    expect(within(dialog).getByText('com_access_group_managed_badge')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('All active members')).toBeDisabled();
    expect(within(dialog).queryByLabelText('com_access_remove_member Ada')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('combobox')).not.toBeInTheDocument();
    expect(within(dialog).getByText('com_ui_save')).toBeDisabled();
  });

  it('keeps an ordinary group editable', async () => {
    renderTab();

    fireEvent.click(await screen.findByText('Faculty'));
    const dialog = await screen.findByRole('dialog');

    await within(dialog).findByText('Ada');
    expect(within(dialog).queryByText('com_access_group_managed_badge')).not.toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('Faculty')).not.toBeDisabled();
    expect(within(dialog).getByLabelText('com_access_remove_member Ada')).toBeInTheDocument();
  });
});
