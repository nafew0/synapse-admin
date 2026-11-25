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
  setUserUsagePackageFn,
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

  it('sends a member override with its reason', async () => {
    await setUserUsagePackageFn({
      data: {
        userId: 'u/1',
        packageKey: 'standard',
        expiresAt: '2026-12-31T00:00:00.000Z',
        reason: 'bdren.ai is down',
      },
    });
    expect(apiFetch).toHaveBeenCalledWith('/api/platform/users/u%2F1/usage-package', {
      method: 'PUT',
      body: JSON.stringify({
        packageKey: 'standard',
        expiresAt: '2026-12-31T00:00:00.000Z',
        reason: 'bdren.ai is down',
      }),
    });
  });

  it("surfaces Synapse's refusal of a member override", async () => {
    const failed = new Response('{}', { status: 400 });
    apiFetch.mockResolvedValueOnce(failed);
    extractApiError.mockRejectedValueOnce(new Error('An override lasts at most 90 days'));
    await expect(
      setUserUsagePackageFn({ data: { userId: 'u1', packageKey: 'standard', expiresAt: null } }),
    ).rejects.toThrow('An override lasts at most 90 days');
    expect(extractApiError).toHaveBeenCalledWith(failed, 'Failed to assign the member package');
  });

  it('surfaces the API error', async () => {
    const failed = new Response('{}', { status: 403 });
    apiFetch.mockResolvedValueOnce(failed);
    extractApiError.mockRejectedValueOnce(new Error('Forbidden'));
    await expect(archiveUsagePackageFn({ data: { key: 'x' } })).rejects.toThrow('Forbidden');
    expect(extractApiError).toHaveBeenCalledWith(failed, 'Failed to archive package');
  });
});
