import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: React.ReactNode }) => <a>{children}</a>,
  getRouteApi: () => ({
    useRouteContext: () => ({ user: { isPlatformSuperadmin: true } }),
  }),
}));

vi.mock('@clickhouse/click-ui', () => ({
  Icon: () => <span />,
  SearchField: () => <input />,
  Button: ({ label, onClick }: { label?: string; onClick?: () => void }) => (
    <button onClick={onClick}>{label}</button>
  ),
}));

vi.mock('@/server', () => ({
  listPlatformInstitutionsFn: vi.fn().mockResolvedValue({
    institutions: [
      {
        _id: 'a',
        tenantId: 'tenant-a',
        name: 'Alpha University',
        status: 'active',
        stats: { activeMembers: 4 },
      },
    ],
    total: 1,
    limit: 25,
    offset: 0,
  }),
  getBdrenAdminUrlFn: vi.fn().mockResolvedValue('https://bdren.ai/admin'),
}));

const { InstitutionsPage } = await import('../InstitutionsPage');

describe('InstitutionsPage', () => {
  it('lists institutions read-only and points to the bdren.ai admin panel', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <InstitutionsPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Alpha University')).toBeTruthy();
    expect(screen.getByText('Open')).toBeTruthy();

    const link = await screen.findByRole('link', { name: 'com_bdren_note_link' });
    expect(link.getAttribute('href')).toBe('https://bdren.ai/admin');
    expect(screen.getByText('com_bdren_note')).toBeTruthy();

    for (const label of [
      /create institution/i,
      /invite/i,
      /suspend/i,
      /remove/i,
      /seat/i,
    ]) {
      expect(screen.queryByText(label)).toBeNull();
      expect(screen.queryByRole('button', { name: label })).toBeNull();
    }
  });
});
