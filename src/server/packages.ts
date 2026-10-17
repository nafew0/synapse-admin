import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import type * as t from '@/types';
import { apiFetch, extractApiError } from './utils/api';

const BASE = '/api/platform/usage-packages';

const percent = z.number().min(1).max(100);

const packageInput = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500),
  scopes: z.array(z.enum(['member', 'institution'])).min(1),
  price: z.number().min(0),
  monthlyCredit: z.number().positive(),
  weeklyPercent: percent.nullable(),
  unlimited: z.boolean(),
  active: z.boolean(),
  sortOrder: z.number().int(),
});

const pricingInput = z.object({
  bdtPerUsd: z.number().min(1).max(10_000),
  providerFeePercent: z.number().min(0).max(100),
  defaultWeeklyPercent: percent,
});

async function send<T>(path: string, init: RequestInit, fallback: string): Promise<T> {
  const response = await apiFetch(path, init);
  if (!response.ok) await extractApiError(response, fallback);
  return response.json();
}

export const listUsagePackagesFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ includeArchived: z.boolean().optional() }))
  .handler(async ({ data }): Promise<t.UsagePackageList> => {
    const query = data.includeArchived ? '?includeArchived=true' : '';
    return send(`${BASE}${query}`, {}, 'Failed to load packages');
  });

export const createUsagePackageFn = createServerFn({ method: 'POST' })
  .inputValidator(packageInput.extend({ key: z.string().trim().min(2).max(40) }))
  .handler(
    async ({ data }): Promise<{ package: t.UsagePackage }> =>
      send(BASE, { method: 'POST', body: JSON.stringify(data) }, 'Failed to create package'),
  );

export const updateUsagePackageFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ key: z.string().min(1), patch: packageInput.partial() }))
  .handler(
    async ({ data }): Promise<{ package: t.UsagePackage }> =>
      send(
        `${BASE}/${encodeURIComponent(data.key)}`,
        { method: 'PATCH', body: JSON.stringify(data.patch) },
        'Failed to update package',
      ),
  );

export const archiveUsagePackageFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ key: z.string().min(1) }))
  .handler(
    async ({ data }): Promise<{ package: t.UsagePackage }> =>
      send(
        `${BASE}/${encodeURIComponent(data.key)}/archive`,
        { method: 'POST' },
        'Failed to archive package',
      ),
  );

export const updateUsagePricingFn = createServerFn({ method: 'POST' })
  .inputValidator(pricingInput)
  .handler(
    async ({ data }): Promise<{ pricing: t.UsagePricing }> =>
      send(
        `${BASE}/pricing`,
        { method: 'PUT', body: JSON.stringify(data) },
        'Failed to save pricing',
      ),
  );
