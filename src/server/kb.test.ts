import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.fn();
const extractApiError = vi.fn();

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    handler: (fn: (...args: unknown[]) => unknown) => fn,
    inputValidator: () => ({
      handler: (fn: (...args: unknown[]) => unknown) => fn,
    }),
  }),
}));

vi.mock('./utils/api', () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  extractApiError: (...args: unknown[]) => extractApiError(...args),
}));

import { getKbStorageFn, listKbStorageFn } from './kb';

describe('knowledge base storage server functions', () => {
  beforeEach(() => {
    apiFetch.mockReset().mockImplementation(async () => new Response('{}', { status: 200 }));
    extractApiError.mockReset();
  });

  it('reads the platform list for a number of days', async () => {
    await listKbStorageFn({ data: { days: 30 } } as never);
    expect(apiFetch.mock.calls[0][0]).toBe('/api/platform/kb/storage?days=30');
  });

  it('encodes the tenant id in the institution path', async () => {
    await getKbStorageFn({ data: { tenantId: 'uni/a b', days: 90 } } as never);
    expect(apiFetch.mock.calls[0][0]).toBe(
      '/api/platform/institutions/uni%2Fa%20b/kb/storage?days=90',
    );
  });

  it('passes a failed response to the shared error reader', async () => {
    apiFetch.mockResolvedValue(new Response('{"error":"no"}', { status: 403 }));
    await listKbStorageFn({ data: {} } as never);
    expect(apiFetch.mock.calls[0][0]).toBe('/api/platform/kb/storage');
    expect(extractApiError).toHaveBeenCalledWith(
      expect.any(Response),
      'Failed to load knowledge base storage',
    );
  });
});
