import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { apiFetch, extractApiError } from './utils/api';

const manifestSchema = z.object({ master: z.record(z.unknown()), specialists: z.array(z.record(z.unknown())).default([]) });
const catalogUrl = '/api/platform/agents/catalog';

export const getOfficeAgentsManifestFn = createServerFn({ method: 'GET' }).handler(async () => {
  const response = await apiFetch(`${catalogUrl}/office-manifest`);
  if (!response.ok) await extractApiError(response, 'Failed to load office-agent manifest');
  return response.json();
});

export const getAgentsCatalogFn = createServerFn({ method: 'GET' }).handler(async () => {
  const response = await apiFetch(catalogUrl);
  if (!response.ok) await extractApiError(response, 'Failed to load agent catalog');
  return response.json();
});

export const previewAgentsCatalogFn = createServerFn({ method: 'POST' })
  .inputValidator(manifestSchema)
  .handler(async ({ data }) => {
    const response = await apiFetch(`${catalogUrl}/preview`, { method: 'POST', body: JSON.stringify(data) });
    if (!response.ok) await extractApiError(response, 'Failed to preview agent synchronization');
    return response.json();
  });

export const applyAgentsCatalogFn = createServerFn({ method: 'POST' })
  .inputValidator(manifestSchema)
  .handler(async ({ data }) => {
    const response = await apiFetch(`${catalogUrl}/apply`, { method: 'POST', body: JSON.stringify(data) });
    if (!response.ok) await extractApiError(response, 'Failed to synchronize agent catalog');
    return response.json();
  });

export const updateAgentCatalogFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().min(1), patch: z.record(z.unknown()) }))
  .handler(async ({ data }) => {
    const response = await apiFetch(`${catalogUrl}/${encodeURIComponent(data.id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data.patch),
    });
    if (!response.ok) await extractApiError(response, 'Failed to update agent');
    return response.json();
  });
