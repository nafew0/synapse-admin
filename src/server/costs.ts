import { z } from 'zod';
import { createServerFn } from '@tanstack/react-start';
import type * as t from '@/types';
import { apiFetch, extractApiError } from './utils/api';

const BASE = '/api/platform/costs';

const rangeSchema = z.object({ start: z.string().optional(), end: z.string().optional() });
const tenantSchema = rangeSchema.extend({ tenantId: z.string().min(1) });

const fixedCostSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1).max(120),
  amount: z.number().min(0).max(1e9),
  currency: z.enum(['USD', 'BDT']),
});

const settingsSchema = z.object({
  bdtPerUsd: z.number().min(1).max(10_000).optional(),
  providerFeePercent: z.number().min(0).max(100).optional(),
  fixedCosts: z.array(fixedCostSchema).max(50).optional(),
});

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

async function load<T>(path: string, fallback: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);
  if (!response.ok) await extractApiError(response, fallback);
  return (await response.json()) as T;
}

export const getCostSummaryFn = createServerFn({ method: 'GET' })
  .inputValidator(rangeSchema)
  .handler(
    async ({ data }): Promise<t.CostSummary> =>
      load(`${BASE}/summary${buildQuery(data)}`, 'Failed to load the cost summary'),
  );

export const getCostInstitutionsFn = createServerFn({ method: 'GET' })
  .inputValidator(rangeSchema.extend({ sort: z.string().optional() }))
  .handler(
    async ({ data }): Promise<t.CostInstitutionsResponse> =>
      load(`${BASE}/institutions${buildQuery(data)}`, 'Failed to load institution costs'),
  );

export const getCostServicesFn = createServerFn({ method: 'GET' })
  .inputValidator(rangeSchema)
  .handler(
    async ({ data }): Promise<t.CostServicesResponse> =>
      load(`${BASE}/services${buildQuery(data)}`, 'Failed to load service costs'),
  );

export const getCostTimeseriesFn = createServerFn({ method: 'GET' })
  .inputValidator(
    rangeSchema.extend({ groupBy: z.enum(['service', 'institution']).default('service') }),
  )
  .handler(
    async ({ data }): Promise<t.CostTimeseriesResponse> =>
      load(`${BASE}/timeseries${buildQuery(data)}`, 'Failed to load the daily cost'),
  );

export const getCostInstitutionFn = createServerFn({ method: 'GET' })
  .inputValidator(tenantSchema)
  .handler(
    async ({ data }): Promise<t.CostInstitutionDetail> =>
      load(
        `${BASE}/institutions/${encodeURIComponent(data.tenantId)}${buildQuery({ start: data.start, end: data.end })}`,
        'Failed to load the institution cost',
      ),
  );

export const getCostRequestsFn = createServerFn({ method: 'GET' })
  .inputValidator(
    rangeSchema.extend({
      tenantId: z.string().optional(),
      user: z.string().optional(),
      service: z.string().optional(),
      limit: z.number().int().min(1).max(200).optional(),
      before: z.string().optional(),
    }),
  )
  .handler(
    async ({ data }): Promise<t.CostRequestsResponse> =>
      load(`${BASE}/requests${buildQuery(data)}`, 'Failed to load requests'),
  );

export const getCostSettingsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ settings: t.CostSettings }> =>
    load(`${BASE}/settings`, 'Failed to load cost settings'),
);

export const updateCostSettingsFn = createServerFn({ method: 'POST' })
  .inputValidator(settingsSchema)
  .handler(
    async ({ data }): Promise<{ settings: t.CostSettings }> =>
      load(`${BASE}/settings`, 'Failed to save cost settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
  );

export const exportCostCsvFn = createServerFn({ method: 'POST' })
  .inputValidator(
    rangeSchema.extend({
      sheet: z.enum(['institutions', 'members', 'daily']).default('institutions'),
    }),
  )
  .handler(async ({ data }): Promise<Response> => {
    const response = await apiFetch(`${BASE}/export.csv${buildQuery(data)}`, {
      headers: { Accept: 'text/csv' },
    });
    if (!response.ok) await extractApiError(response, 'Failed to export costs');
    const fallback = `attachment; filename="costs-${data.sheet}-${new Date().toISOString().slice(0, 10)}.csv"`;
    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') ?? 'text/csv; charset=utf-8',
        'Content-Disposition': response.headers.get('Content-Disposition') ?? fallback,
        'Cache-Control': 'no-store',
      },
    });
  });

export const getReconciliationFn = createServerFn({ method: 'GET' })
  .inputValidator(rangeSchema)
  .handler(
    async ({ data }): Promise<t.Reconciliation> =>
      load(`${BASE}/reconciliation${buildQuery(data)}`, 'Failed to load the reconciliation'),
  );

export const refreshProviderFiguresFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<t.ReconcileRefreshResult> =>
    load(`${BASE}/reconciliation/refresh`, 'Failed to refresh provider figures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }),
);

export const saveUnstructuredEntryFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
      amountUsd: z.number().min(0).max(1_000_000),
      pages: z.number().int().min(0).optional(),
      note: z.string().trim().max(200).optional(),
    }),
  )
  .handler(
    async ({ data }): Promise<{ month: string; amountUsd: number }> =>
      load(`${BASE}/reconciliation/unstructured`, 'Failed to save the Unstructured figure', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
  );
