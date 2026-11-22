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
  exportCostCsvFn,
  getCostInstitutionFn,
  getCostSummaryFn,
  getCostTimeseriesFn,
  updateCostSettingsFn,
} from './costs';

const range = { start: '2026-11-01', end: '2026-11-07' };

describe('cost server functions', () => {
  beforeEach(() => {
    apiFetch.mockReset().mockImplementation(async () => new Response('{}', { status: 200 }));
    extractApiError.mockReset();
  });

  it('reads the summary for a range', async () => {
    await getCostSummaryFn({ data: range } as never);
    expect(apiFetch.mock.calls[0][0]).toBe(
      '/api/platform/costs/summary?start=2026-11-01&end=2026-11-07',
    );
  });

  it('groups the timeseries by the chosen dimension', async () => {
    await getCostTimeseriesFn({ data: { ...range, groupBy: 'institution' } } as never);
    expect(apiFetch.mock.calls[0][0]).toContain('/timeseries?');
    expect(apiFetch.mock.calls[0][0]).toContain('groupBy=institution');
  });

  it('encodes the tenant id in the institution path', async () => {
    await getCostInstitutionFn({ data: { ...range, tenantId: '__individuals__/x' } } as never);
    expect(apiFetch.mock.calls[0][0]).toContain('/institutions/__individuals__%2Fx?');
  });

  it('sends settings as a PUT with a JSON body', async () => {
    const data = {
      bdtPerUsd: 122.5,
      fixedCosts: [{ label: 'Servers', amount: 50, currency: 'USD' }],
    };
    await updateCostSettingsFn({ data } as never);
    const [path, init] = apiFetch.mock.calls[0];
    expect(path).toBe('/api/platform/costs/settings');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual(data);
  });

  it('passes the CSV and its filename through', async () => {
    apiFetch.mockResolvedValueOnce(
      new Response('a,b', {
        status: 200,
        headers: { 'Content-Disposition': 'attachment; filename="costs-daily.csv"' },
      }),
    );
    const response = await exportCostCsvFn({ data: { ...range, sheet: 'daily' } } as never);
    expect(apiFetch.mock.calls[0][0]).toContain('/export.csv?');
    expect(apiFetch.mock.calls[0][0]).toContain('sheet=daily');
    expect(response.headers.get('Content-Disposition')).toContain('costs-daily.csv');
    expect(await response.text()).toBe('a,b');
  });

  it('raises the API error for a failed call', async () => {
    apiFetch.mockResolvedValueOnce(new Response('{}', { status: 403 }));
    await getCostSummaryFn({ data: range } as never);
    expect(extractApiError).toHaveBeenCalledOnce();
  });
});
