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

import { checkAlertsFn, listAlertsFn, markAlertsSeenFn } from './alerts';

describe('alert server functions', () => {
  beforeEach(() => {
    apiFetch.mockReset().mockImplementation(async () => new Response('{}', { status: 200 }));
    extractApiError.mockReset();
  });

  it('reads the platform alerts', async () => {
    await listAlertsFn();
    expect(apiFetch.mock.calls[0][0]).toBe('/api/platform/alerts');
  });

  it('marks one alert, or all of them, as seen', async () => {
    await markAlertsSeenFn({ data: { alertId: 'a/1' } });
    await markAlertsSeenFn({ data: {} });
    expect(apiFetch.mock.calls.map(([path, init]) => [path, init.method])).toEqual([
      ['/api/platform/alerts/a%2F1/seen', 'POST'],
      ['/api/platform/alerts/seen', 'POST'],
    ]);
  });

  it('runs the checks with a POST', async () => {
    await checkAlertsFn();
    expect(apiFetch.mock.calls[0]).toEqual(['/api/platform/alerts/check', { method: 'POST' }]);
  });

  it('surfaces the API error when a call fails', async () => {
    apiFetch.mockResolvedValue(new Response('{}', { status: 403 }));
    extractApiError.mockRejectedValue(new Error('forbidden'));
    await expect(listAlertsFn()).rejects.toThrow('forbidden');
  });
});
