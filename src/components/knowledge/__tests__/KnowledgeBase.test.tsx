import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import type * as t from '@/types';
import '@/locales/i18n';

vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({ useRouteContext: () => ({ user: { id: 'admin-1' } }) }),
}));

vi.mock('@clickhouse/click-ui', () => ({
  ConfirmationDialog: () => null,
  createToast: vi.fn(),
}));

const notifySuccess = vi.fn();
const notifyError = vi.fn();
vi.mock('@/utils/toast', () => ({
  notifySuccess: (title: string) => notifySuccess(title),
  notifyError: (title: string) => notifyError(title),
}));

const document = (overrides: Partial<t.KbDocument>): t.KbDocument => ({
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  title: 'BdREN contacts',
  docType: 'directory',
  status: 'processing',
  error: null,
  currentVersion: 0,
  latestVersion: 1,
  filename: 'contacts.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 75_936,
  pageCount: 0,
  chunkCount: 0,
  unreadablePages: [],
  ...overrides,
});

const listing = (documents: t.KbDocument[]): t.KbListResponse => ({
  documents,
  usage: { documents: documents.length, bytes: 75_936 },
  limits: { maxDocuments: 200, maxFileBytes: 52_428_800, maxTotalBytes: 1_073_741_824 },
  extensions: ['.pdf', '.docx'],
  docTypes: ['directory', 'other'],
});

const listKbDocumentsFn = vi.fn();
vi.mock('@/server', () => ({
  listKbDocumentsFn: (...args: unknown[]) => listKbDocumentsFn(...args),
  uploadKbDocumentFn: vi.fn(),
  deleteKbDocumentFn: vi.fn(),
  getEffectiveCapabilitiesFn: vi.fn().mockResolvedValue({ capabilities: ['read:kb', 'manage:kb'] }),
}));

const { KnowledgeBase } = await import('../KnowledgeBase');

describe('KnowledgeBase', () => {
  it('shows documents being built, then announces the one that became ready', async () => {
    listKbDocumentsFn.mockResolvedValue(listing([document({ status: 'processing' })]));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <KnowledgeBase />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('BdREN contacts')).toBeTruthy();
    expect(screen.getByText('Processing')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/1 in progress/);
    expect(await screen.findByText('Add a document')).toBeTruthy();

    listKbDocumentsFn.mockResolvedValue(
      listing([document({ status: 'ready', currentVersion: 1, pageCount: 1, chunkCount: 4 })]),
    );
    await act(() => client.invalidateQueries());

    await waitFor(() => expect(screen.getByText('Ready')).toBeTruthy());
    expect(screen.getByText('1 pages · 4 searchable passages')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
    expect(notifySuccess).toHaveBeenCalledWith(
      '"BdREN contacts" is ready. Members can now use it in chat.',
    );
  });

  it('reports a failed replacement while the old version stays live', async () => {
    const id = 'bbbbbbbbbbbbbbbbbbbbbbbb';
    listKbDocumentsFn.mockResolvedValue(
      listing([document({ id, status: 'processing', currentVersion: 1, latestVersion: 2 })]),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <KnowledgeBase />
      </QueryClientProvider>,
    );
    expect(
      await screen.findByText('Version 1 stays searchable while version 2 is processed.'),
    ).toBeTruthy();

    listKbDocumentsFn.mockResolvedValue(
      listing([
        document({
          id,
          status: 'ready',
          currentVersion: 1,
          latestVersion: 2,
          error: 'Version 2 failed: not a PDF',
        }),
      ]),
    );
    await act(() => client.invalidateQueries());
    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith(
        '"BdREN contacts" could not be processed. Version 2 failed: not a PDF',
      ),
    );
  });
});
