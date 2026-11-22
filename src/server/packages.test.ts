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
  listUsagePackagesFn,
  updateUsagePackageFn,
  updateUsagePricingFn,
  archiveUsagePackageFn,
} from './packages';

const ok = () => new Response(JSON.stringify({}), { status: 200 });

describe('usage package server functions', () => {
  beforeEach(() => {
    apiFetch.mockReset().mockImplementation(async () => ok());
    extractApiError.mockReset();
  });

  it('asks for archived packages only when requested', async () => {
    await listUsagePackagesFn({ data: {} });
    await listUsagePackagesFn({ data: { includeArchived: true } });
    expect(apiFetch.mock.calls.map(([path]) => path)).toEqual([
      '/api/platform/usage-packages',
      '/api/platform/usage-packages?includeArchived=true',
    ]);
  });

  it('encodes the key and patches only the changed fields', async () => {
    await updateUsagePackageFn({ data: { key: 'a/b', patch: { price: 10 } } });
    expect(apiFetch).toHaveBeenCalledWith('/api/platform/usage-packages/a%2Fb', {
      method: 'PATCH',
      body: JSON.stringify({ price: 10 }),
    });
  });

  it('archives and saves pricing with the right verbs', async () => {
    await archiveUsagePackageFn({ data: { key: 'starter' } });
    await updateUsagePricingFn({
      data: { bdtPerUsd: 123, providerFeePercent: 0, defaultWeeklyPercent: 35 },
    });
    expect(apiFetch.mock.calls[0]).toEqual([
      '/api/platform/usage-packages/starter/archive',
      { method: 'POST' },
    ]);
    expect(apiFetch.mock.calls[1][1]).toMatchObject({ method: 'PUT' });
  });

  it('surfaces the API error', async () => {
    const failed = new Response('{}', { status: 403 });
    apiFetch.mockResolvedValueOnce(failed);
    extractApiError.mockRejectedValueOnce(new Error('Forbidden'));
    await expect(archiveUsagePackageFn({ data: { key: 'x' } })).rejects.toThrow('Forbidden');
    expect(extractApiError).toHaveBeenCalledWith(failed, 'Failed to archive package');
  });
});
