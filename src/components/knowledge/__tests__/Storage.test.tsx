import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type * as t from '@/types';
import '@/locales/i18n';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="#institution">{children}</a>,
  getRouteApi: () => ({ useRouteContext: () => ({ user: { id: 'admin-1' } }) }),
}));

vi.mock('@clickhouse/click-ui', () => ({
  Icon: () => <span />,
  createToast: vi.fn(),
}));

const getKbStorageFn = vi.fn();
const listKbStorageFn = vi.fn();
vi.mock('@/server', () => ({
  getKbStorageFn: (...args: unknown[]) => getKbStorageFn(...args),
  listKbStorageFn: (...args: unknown[]) => listKbStorageFn(...args),
}));

const { StoragePanel } = await import('../Storage');
const { KbStorageTable } = await import('../Platform');

const MB = 1024 ** 2;

const current = (overrides: Partial<t.KbStorageCurrent> = {}): t.KbStorageCurrent => ({
  documents: 3,
  versions: 5,
  originalBytes: 12 * MB,
  parsedBytes: 2 * MB,
  indexChunks: 140,
  totalBytes: 14 * MB,
  limitBytes: 1024 * MB,
  measuredAt: '2026-11-21T06:00:00.000Z',
  ...overrides,
});

const day = (date: string, totalBytes: number): t.KbStorageDay => ({
  day: date,
  documents: 3,
  versions: 5,
  originalBytes: totalBytes,
  parsedBytes: 0,
  totalBytes,
});

function renderWithQuery(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

describe('StoragePanel', () => {
  it("shows the institution's disk use and asks for 90 days of it", async () => {
    getKbStorageFn.mockResolvedValue({
      tenantId: 'uni-a',
      name: 'Uni A',
      days: 90,
      current: current(),
      daily: [day('2026-11-20', 10 * MB), day('2026-11-21', 14 * MB)],
    } satisfies t.KbInstitutionStorage);
    renderWithQuery(<StoragePanel tenantId="uni-a" />);

    expect((await screen.findAllByText('14.0 MB')).length).toBeGreaterThan(0);
    expect(screen.getByRole('figure')).toBeTruthy();
    expect(screen.getByText('12.0 MB files · 2.0 MB parsed text')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('140')).toBeTruthy();
    expect(screen.queryByText(/appears once storage/)).toBeNull();
    expect(getKbStorageFn).toHaveBeenCalledWith({ data: { tenantId: 'uni-a', days: 90 } });
  });

  it('explains the missing trend while only one day is recorded', async () => {
    getKbStorageFn.mockResolvedValue({
      tenantId: 'uni-b',
      name: 'Uni B',
      days: 90,
      current: current({ totalBytes: 0, originalBytes: 0, parsedBytes: 0 }),
      daily: [day('2026-11-21', 0)],
    } satisfies t.KbInstitutionStorage);
    renderWithQuery(<StoragePanel tenantId="uni-b" />);
    expect(await screen.findByText(/appears once storage/)).toBeTruthy();
  });

  it('shows the error when storage cannot be read', async () => {
    getKbStorageFn.mockRejectedValue(new Error('Platform superadmin privileges required'));
    renderWithQuery(<StoragePanel tenantId="uni-c" />);
    expect(await screen.findByText('Platform superadmin privileges required')).toBeTruthy();
  });
});

describe('KbStorageTable', () => {
  const row = (tenantId: string, name: string, totalBytes: number, versions: number) => ({
    tenantId,
    name,
    status: 'active',
    current: current({ totalBytes, originalBytes: totalBytes, parsedBytes: 0, versions }),
    trend: [
      { day: '2026-11-20', totalBytes: totalBytes / 2 },
      { day: '2026-11-21', totalBytes },
    ],
  });

  it('lists institutions that store files, with the platform total', async () => {
    listKbStorageFn.mockResolvedValue({
      days: 90,
      measuredAt: '2026-11-21T06:00:00.000Z',
      limitBytes: 1024 * MB,
      totals: { ...current({ totalBytes: 30 * MB, versions: 7, documents: 6 }) },
      institutions: [
        row('uni-a', 'Uni A', 20 * MB, 4),
        row('uni-b', 'Uni B', 10 * MB, 3),
        row('uni-empty', 'Empty U', 0, 0),
      ],
    } satisfies t.KbPlatformStorage);
    renderWithQuery(<KbStorageTable />);

    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('Institution'),
      expect.stringContaining('Uni A'),
      expect.stringContaining('Uni B'),
      expect.stringContaining('All institutions'),
    ]);
    expect(within(rows[1]).getByText('20.0 MB')).toBeTruthy();
    expect(within(rows[3]).getByText('30.0 MB')).toBeTruthy();
    expect(screen.queryByText('Empty U')).toBeNull();
    expect(listKbStorageFn).toHaveBeenCalledWith({ data: { days: 90 } });
  });

  it('says so when no institution stores anything', async () => {
    listKbStorageFn.mockResolvedValue({
      days: 90,
      measuredAt: '2026-11-21T06:00:00.000Z',
      limitBytes: 1024 * MB,
      totals: current({ totalBytes: 0, versions: 0, documents: 0 }),
      institutions: [row('uni-empty', 'Empty U', 0, 0)],
    } satisfies t.KbPlatformStorage);
    renderWithQuery(<KbStorageTable />);
    expect(await screen.findByText(/No institution has stored/)).toBeTruthy();
  });
});
