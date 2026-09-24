import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as t from '@/types';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: React.ReactNode }) => <a>{children}</a>,
  getRouteApi: () => ({
    useParams: () => ({ tenantId: 'tenant-a' }),
    useRouteContext: () => ({ user: { isPlatformSuperadmin: true } }),
  }),
}));

const createToast = vi.fn();

vi.mock('@clickhouse/click-ui', () => ({
  createToast: (...args: unknown[]) => createToast(...args),
  Icon: () => <span />,
  Button: ({
    label,
    onClick,
    disabled,
  }: {
    label?: string;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  ),
  Switch: ({
    checked,
    disabled,
    onCheckedChange,
    'aria-label': ariaLabel,
  }: {
    checked: boolean;
    disabled?: boolean;
    onCheckedChange?: (value: boolean) => void;
    'aria-label'?: string;
  }) => (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
    />
  ),
}));

vi.mock('@/server', () => ({
  getPlatformInstitutionFn: vi.fn().mockResolvedValue({
    institution: { tenantId: 'tenant-a', name: 'Test Institution', status: 'active' },
  }),
  getPlatformInstitutionQuotaFn: vi.fn().mockResolvedValue({
    policy: {
      version: 1,
      mode: 'shadow',
      timezone: 'Asia/Dhaka',
      limits: { institutionTokens: null, memberTokens: null, modelTokens: [] },
      warningThresholds: [],
    },
    health: {
      range: { start: '2026-09-01T00:00:00Z', end: '2026-10-01T00:00:00Z', timezone: 'Asia/Dhaka' },
      buckets: [],
      warnings: [],
    },
    models: [],
  }),
  getPlatformInstitutionQuotaReadinessFn: vi.fn().mockResolvedValue(undefined),
  getMembersFn: vi.fn().mockResolvedValue({ members: [], total: 0 }),
  getPlatformInstitutionAgentAccessFn: vi.fn(),
  listPlatformInstitutionPoliciesFn: vi.fn().mockResolvedValue({ policies: [] }),
  previewPlatformInstitutionPolicyFn: vi.fn(),
  createPlatformInstitutionPolicyFn: vi.fn(),
  revokePlatformInstitutionAdminFn: vi.fn(),
  updatePlatformInstitutionAgentAccessFn: vi.fn(),
  reconcilePlatformInstitutionAgentAccessFn: vi.fn(),
}));

const { InstitutionDetailPage } = await import('../InstitutionDetailPage');
const {
  getPlatformInstitutionAgentAccessFn,
  updatePlatformInstitutionAgentAccessFn,
  reconcilePlatformInstitutionAgentAccessFn,
} = await import('@/server');

const getAccess = vi.mocked(getPlatformInstitutionAgentAccessFn);
const updateAccess = vi.mocked(updatePlatformInstitutionAgentAccessFn);
const reconcile = vi.mocked(reconcilePlatformInstitutionAgentAccessFn);

const officeAssistant: t.PlatformAgentAccessAgent = {
  id: 'agent-office',
  name: 'Office Assistant',
  description: 'Drafts letters',
  tenantId: null,
  enabled: false,
};

const syncedAudience: t.PlatformAgentAccessAudience = {
  groupId: 'group-1',
  name: 'All active members',
  activeMemberCount: 5,
  enrolledMemberCount: 5,
  missingMemberCount: 0,
  staleMemberCount: 0,
  inSync: true,
};

function accessResponse(
  overrides: Partial<t.PlatformAgentAccessResponse> = {},
): t.PlatformAgentAccessResponse {
  return { agents: [officeAssistant], audience: syncedAudience, ...overrides };
}

async function openAgentsTab() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <InstitutionDetailPage />
    </QueryClientProvider>,
  );
  fireEvent.click(await screen.findByText('Agents'));
  return screen.findByRole('switch', { name: 'Office Assistant access for all active members' });
}

describe('institution agent access', () => {
  beforeEach(() => {
    getAccess.mockReset();
    updateAccess.mockReset();
    reconcile.mockReset();
    createToast.mockReset();
    getAccess.mockResolvedValue(accessResponse());
  });

  it('offers agents to all active members without a group selector', async () => {
    await openAgentsTab();

    expect(screen.getByText('Available to all active members')).toBeInTheDocument();
    expect(
      screen.getByText(
        /New members receive access automatically; suspended and removed members lose access\./,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByText('Institution group')).not.toBeInTheDocument();
    expect(getAccess).toHaveBeenCalledWith({ data: { tenantId: 'tenant-a' } });
  });

  it('enables an agent for the tenant and refetches access afterwards', async () => {
    updateAccess.mockResolvedValue({
      tenantId: 'tenant-a',
      agentId: 'agent-office',
      enabled: true,
      audienceGroupId: 'group-1',
      activeMemberCount: 5,
      delegatedAgentCount: 3,
    });
    const toggle = await openAgentsTab();

    fireEvent.click(toggle);

    await waitFor(() =>
      expect(updateAccess).toHaveBeenCalledWith({
        data: { tenantId: 'tenant-a', agentId: 'agent-office', enabled: true },
      }),
    );
    await waitFor(() => expect(getAccess).toHaveBeenCalledTimes(2));
  });

  it('shows active and enrolled counts without a warning when in sync', async () => {
    await openAgentsTab();

    expect(screen.getByText('Active members').nextSibling).toHaveTextContent('5');
    expect(screen.getByText('Enrolled members').nextSibling).toHaveTextContent('5');
    expect(screen.queryByText(/do not match active members/)).not.toBeInTheDocument();
    expect(screen.queryByText('Reconcile members')).not.toBeInTheDocument();
  });

  it('warns about drift and reconciles members on request', async () => {
    getAccess.mockResolvedValue(
      accessResponse({
        audience: {
          ...syncedAudience,
          enrolledMemberCount: 4,
          missingMemberCount: 2,
          staleMemberCount: 1,
          inSync: false,
        },
      }),
    );
    reconcile.mockResolvedValue({
      tenantId: 'tenant-a',
      audienceGroupId: 'group-1',
      dryRun: false,
      added: 2,
      removed: 1,
      unchanged: 3,
      activeMemberCount: 5,
    });
    await openAgentsTab();

    expect(screen.getByText('Enrolled members').nextSibling).toHaveTextContent('4');
    expect(
      screen.getByText(/do not match active members \(2 missing, 1 stale\)/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('Reconcile members'));

    await waitFor(() => expect(reconcile).toHaveBeenCalledWith({ data: { tenantId: 'tenant-a' } }));
    await waitFor(() => expect(getAccess).toHaveBeenCalledTimes(2));
  });

  it('explains that enabling enrolls members when no audience exists yet', async () => {
    getAccess.mockResolvedValue(accessResponse({ audience: null }));
    await openAgentsTab();

    expect(screen.getByText(/No members are enrolled yet/)).toBeInTheDocument();
    expect(screen.queryByText('Reconcile members')).not.toBeInTheDocument();
  });

  it('locks switches while pending and does not claim access before the server confirms', async () => {
    updateAccess.mockReturnValue(new Promise(() => undefined));
    const toggle = await openAgentsTab();

    fireEvent.click(toggle);

    await waitFor(() => expect(toggle).toBeDisabled());
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('Saving…')).toBeInTheDocument();
  });

  it('shows the server error and keeps the confirmed state after a failed update', async () => {
    updateAccess.mockRejectedValue(new Error('Agent belongs to another tenant'));
    const toggle = await openAgentsTab();

    fireEvent.click(toggle);

    expect(await screen.findByRole('alert')).toHaveTextContent('Agent belongs to another tenant');
    expect(createToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Agent belongs to another tenant' }),
    );
    await waitFor(() => expect(toggle).not.toBeDisabled());
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('shows a load error instead of the switches', async () => {
    getAccess.mockRejectedValue(new Error('Failed to load agent access'));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <InstitutionDetailPage />
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByText('Agents'));

    expect(await screen.findByText('Failed to load agent access')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });
});
