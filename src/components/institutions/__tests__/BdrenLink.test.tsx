import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clickhouse/click-ui', () => ({
  createToast: vi.fn(),
  Dialog: Object.assign(
    ({ open, children }: { open: boolean; children?: React.ReactNode }) =>
      open ? <div>{children}</div> : null,
    { Content: ({ children }: { children?: React.ReactNode }) => <div>{children}</div> },
  ),
  Button: ({ label, onClick }: { label?: string; onClick?: () => void }) => (
    <button type={onClick ? 'button' : 'submit'} onClick={onClick}>
      {label}
    </button>
  ),
}));

vi.mock('@/server', () => ({
  updatePlatformInstitutionBdrenOrganizationFn: vi.fn(),
}));

const { updatePlatformInstitutionBdrenOrganizationFn } = await import('@/server');
const { BdrenLink } = await import('../BdrenLink');
const update = vi.mocked(updatePlatformInstitutionBdrenOrganizationFn);

function renderLink(organizationId?: string | null) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <BdrenLink tenantId="tenant-a" organizationId={organizationId} />
    </QueryClientProvider>,
  );
}

describe('BdrenLink', () => {
  beforeEach(() => {
    update.mockReset();
  });

  it('shows the current organization id, or Not linked', () => {
    const { unmount } = renderLink('org_1');
    expect(screen.getByText('org_1')).toBeTruthy();
    unmount();
    renderLink(null);
    expect(screen.getByText('com_inst_detail_bdren_org_none')).toBeTruthy();
  });

  it('saves a new organization id', async () => {
    update.mockResolvedValue({ tenantId: 'tenant-a', bdrenOrganizationId: 'org_2' });
    renderLink(null);
    fireEvent.click(screen.getByText('com_inst_bdren_edit'));
    expect(screen.getByText('com_inst_bdren_help')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('com_inst_bdren_label'), {
      target: { value: ' org_2 ' },
    });
    fireEvent.click(screen.getByText('com_inst_bdren_save'));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({
        data: { tenantId: 'tenant-a', bdrenOrganizationId: 'org_2' },
      }),
    );
  });

  it('clears the link when the field is emptied', async () => {
    update.mockResolvedValue({ tenantId: 'tenant-a', bdrenOrganizationId: null });
    renderLink('org_1');
    fireEvent.click(screen.getByText('com_inst_bdren_edit'));
    fireEvent.change(screen.getByLabelText('com_inst_bdren_label'), { target: { value: '' } });
    fireEvent.click(screen.getByText('com_inst_bdren_save'));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({
        data: { tenantId: 'tenant-a', bdrenOrganizationId: null },
      }),
    );
  });

  it('shows the conflict when the organization is linked to another institution', async () => {
    update.mockRejectedValue(
      new Error('That bdren.ai organization is already mapped to another institution'),
    );
    renderLink(null);
    fireEvent.click(screen.getByText('com_inst_bdren_edit'));
    fireEvent.change(screen.getByLabelText('com_inst_bdren_label'), { target: { value: 'org_9' } });
    fireEvent.click(screen.getByText('com_inst_bdren_save'));
    expect(await screen.findByRole('alert')).toHaveTextContent('already mapped to another');
  });
});
