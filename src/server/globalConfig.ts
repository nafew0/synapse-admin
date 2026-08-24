import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { safeFieldPath } from './utils/validation';
import { apiFetch, extractApiError } from './utils/api';

const entriesSchema = z.array(z.object({ fieldPath: safeFieldPath, value: z.unknown() })).min(1).max(500);

async function currentVersion(): Promise<number> {
  const response = await apiFetch('/api/admin/global/config');
  if (!response.ok) await extractApiError(response, 'Failed to read global config');
  const body = (await response.json()) as { config?: { configVersion?: number } };
  return body.config?.configVersion ?? 0;
}

export const saveGlobalConfigFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ entries: entriesSchema, expectedVersion: z.number().int().nonnegative().optional() }))
  .handler(async ({ data }) => {
    const response = await apiFetch('/api/admin/global/config/fields', { method: 'PATCH', body: JSON.stringify({ ...data, expectedVersion: data.expectedVersion ?? (await currentVersion()) }) });
    if (!response.ok) await extractApiError(response, 'Failed to save global config');
    return response.json().catch(() => ({ success: true }));
  });

export const importGlobalConfigFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ config: z.record(z.string(), z.unknown()), expectedVersion: z.number().int().nonnegative().optional() }))
  .handler(async ({ data }) => {
    const response = await apiFetch('/api/admin/global/config/import', { method: 'POST', body: JSON.stringify({ overrides: data.config, expectedVersion: data.expectedVersion ?? (await currentVersion()) }) });
    if (!response.ok) await extractApiError(response, 'Failed to import global config');
    return response.json().catch(() => ({ success: true }));
  });

export const resetGlobalConfigFieldFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ fieldPath: safeFieldPath, expectedVersion: z.number().int().nonnegative().optional() }))
  .handler(async ({ data }) => {
    const response = await apiFetch('/api/admin/global/config/fields?fieldPath=' + encodeURIComponent(data.fieldPath), { method: 'DELETE', body: JSON.stringify({ expectedVersion: data.expectedVersion ?? (await currentVersion()) }) });
    if (!response.ok && response.status !== 404) await extractApiError(response, 'Failed to reset global config field');
    return { success: true };
  });

export const resetGlobalConfigFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ expectedVersion: z.number().int().nonnegative().optional() }).optional())
  .handler(async ({ data }) => {
    const response = await apiFetch('/api/admin/global/config', { method: 'DELETE', body: JSON.stringify({ ...(data ?? {}), expectedVersion: data?.expectedVersion ?? (await currentVersion()) }) });
    if (!response.ok && response.status !== 404) await extractApiError(response, 'Failed to reset global config');
    return { success: true };
  });
