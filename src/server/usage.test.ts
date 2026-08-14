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

import {
  exportUsageCsvServerFn,
  getUsageMembersFn,
  getUsageSummaryFn,
} from './usage';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('usage server functions', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    extractApiError.mockReset();
  });

  it('fetches usage summary with date filters', async () => {
    apiFetch.mockResolvedValueOnce(
      jsonResponse(200, {
        range: { start: '2026-07-01T00:00:00.000Z', end: '2026-08-01T00:00:00.000Z' },
        summary: { totalTokens: 1200 },
      }),
    );

    await getUsageSummaryFn({ data: { start: '2026-07-01', end: '2026-08-01' } });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/admin/usage/summary?start=2026-07-01&end=2026-08-01',
    );
  });

  it('fetches paginated member usage', async () => {
    apiFetch.mockResolvedValueOnce(
      jsonResponse(200, {
        range: { start: '2026-07-01T00:00:00.000Z', end: '2026-08-01T00:00:00.000Z' },
        members: [],
        total: 0,
        limit: 10,
        offset: 0,
      }),
    );

    await getUsageMembersFn({
      data: { start: '2026-07-01', end: '2026-08-01', query: 'ada', limit: 10, offset: 0 },
    });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/admin/usage/members?start=2026-07-01&end=2026-08-01&q=ada&limit=10&offset=0',
    );
  });

  it('streams usage CSV exports through the server fn', async () => {
    apiFetch.mockResolvedValueOnce(
      new Response('createdAt,totalTokens\n2026-07-01,100\n', {
        status: 200,
        headers: { 'Content-Type': 'text/csv' },
      }),
    );

    const response = await exportUsageCsvServerFn({
      data: { start: '2026-07-01', end: '2026-08-01' },
    });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/admin/usage/export.csv?start=2026-07-01&end=2026-08-01',
      {
        method: 'GET',
        headers: { Accept: 'text/csv' },
      },
    );
    expect(response.headers.get('Content-Type')).toMatch(/text\/csv/);
  });
});
