import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: React.ReactNode }) => <a>{children}</a>,
  getRouteApi: () => ({
    useParams: () => ({ tenantId: 'tenant-a' }),
    useRouteContext: () => ({ user: { isPlatformSuperadmin: true } }),
  }),
}));

vi.mock('@clickhouse/click-ui', () => ({
  Icon: () => <span />,
  Pagination: () => null,
  SearchField: () => <input />,
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
}));

const policy = {
  version: 3,
  mode: 'shadow',
  timezone: 'Asia/Dhaka',
  limits: {
    institutionTokens: null,
    memberTokens: null,
    modelTokens: [{ modelKey: 'glm-4.6v', maxTokens: 1000 }],
  },
  warningThresholds: [0.8, 0.9],
};

const models = [
  {
    modelKey: 'claude-haiku-4-5',
    label: 'Office Assistant · Claude',
    status: 'active',
    usedTokens: 900,
    reservedTokens: 0,
    limit: null,
    remaining: null,
    utilization: null,
    blocked: false,
  },
  {
    modelKey: 'gpt-5.6-luna',
    label: 'ChatGPT',
    status: 'active',
    usedTokens: 0,
    reservedTokens: 0,
    limit: null,
    remaining: null,
    utilization: null,
    blocked: false,
  },
  {
    modelKey: 'glm-4.6v',
    label: 'glm-4.6v',
    status: 'retired',
    usedTokens: 50,
    reservedTokens: 0,
    limit: 1000,
    remaining: 950,
    utilization: 0.05,
    blocked: false,
  },
];

vi.mock('@/server', () => ({
  getPlatformInstitutionFn: vi.fn().mockResolvedValue({
    institution: {
      tenantId: 'tenant-a',
      name: 'Test Institution',
      slug: 'test',
      status: 'active',
      timezone: 'Asia/Dhaka',
    },
  }),
  getPlatformInstitutionQuotaFn: vi.fn().mockResolvedValue({
    policy,
    health: {
      range: { start: '2026-09-01T00:00:00Z', end: '2026-10-01T00:00:00Z', timezone: 'Asia/Dhaka' },
      buckets: [],
      warnings: [],
    },
    models,
  }),
  getPlatformInstitutionQuotaReadinessFn: vi.fn().mockResolvedValue(undefined),
  getMembersFn: vi.fn().mockResolvedValue({ members: [], total: 0 }),
  getPlatformInstitutionAgentAccessFn: vi.fn().mockResolvedValue({}),
  listPlatformInstitutionPoliciesFn: vi.fn().mockResolvedValue({ policies: [] }),
  previewPlatformInstitutionPolicyFn: vi.fn().mockResolvedValue({
    currentVersion: 3,
    proposedPolicy: policy,
    range: { start: '2026-09-01T00:00:00Z', end: '2026-10-01T00:00:00Z', timezone: 'Asia/Dhaka' },
    impacts: [],
    blocked: [],
    requiresOverageAcknowledgement: false,
  }),
  createPlatformInstitutionPolicyFn: vi.fn(),
  revokePlatformInstitutionAdminFn: vi.fn(),
  updatePlatformInstitutionAgentAccessFn: vi.fn(),
}));

const { InstitutionDetailPage } = await import('../InstitutionDetailPage');
const { previewPlatformInstitutionPolicyFn } = await import('@/server');

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <InstitutionDetailPage />
    </QueryClientProvider>,
  );
}

describe('institution model quota', () => {
  it('lists offered models by the name members see, including unused ones', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('Usage & limits'));

    const breakdown = (await screen.findByText('Model breakdown')).closest(
      'section',
    ) as HTMLElement;
    expect(within(breakdown).getByText('Office Assistant · Claude')).toBeInTheDocument();
    expect(within(breakdown).getByText('claude-haiku-4-5')).toBeInTheDocument();
    expect(within(breakdown).getByText('ChatGPT')).toBeInTheDocument();
    expect(within(breakdown).getByText('No usage yet')).toBeInTheDocument();
  });

  it('marks a model the server no longer offers', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('Usage & limits'));

    const breakdown = (await screen.findByText('Model breakdown')).closest(
      'section',
    ) as HTMLElement;
    expect(within(breakdown).getByText('No longer offered')).toBeInTheDocument();
  });

  it('adds a model limit from the server model list and sends its key', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('Policy'));

    expect(await screen.findByText(/applies to nothing new/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Model to limit'), {
      target: { value: 'gpt-5.6-luna' },
    });
    fireEvent.click(screen.getByText('Add'));
    fireEvent.change(screen.getByLabelText('Token limit for ChatGPT'), {
      target: { value: '5000' },
    });
    fireEvent.click(screen.getByText('Preview'));

    await waitFor(() => expect(previewPlatformInstitutionPolicyFn).toHaveBeenCalled());
    const call = vi.mocked(previewPlatformInstitutionPolicyFn).mock.calls[0][0] as {
      data: {
        policy: { limits: { modelTokens: Array<{ modelKey: string; maxTokens: number | null }> } };
      };
    };
    expect(call.data.policy.limits.modelTokens).toEqual([
      { modelKey: 'glm-4.6v', maxTokens: 1000 },
      { modelKey: 'gpt-5.6-luna', maxTokens: 5000 },
    ]);
  });

  it('does not offer a model that already has a limit', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('Policy'));

    const picker = await screen.findByLabelText('Model to limit');
    const options = within(picker)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(options).toEqual(['Add a limit for…', 'Office Assistant · Claude', 'ChatGPT']);
  });
});
