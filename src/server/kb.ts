import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import type * as t from '@/types';
import { apiFetch, extractApiError } from './utils/api';

const BASE = '/api/admin/kb/documents';

const tenantInput = z.object({ tenantId: z.string().min(1).max(128).optional() });
const documentInput = tenantInput.extend({ documentId: z.string().regex(/^[a-f0-9]{24}$/i) });

/** A superadmin names the institution; an institution admin's own is used server-side. */
const withTenant = (path: string, tenantId?: string): string =>
  tenantId ? `${path}?tenantId=${encodeURIComponent(tenantId)}` : path;

export const listKbDocumentsFn = createServerFn({ method: 'GET' })
  .inputValidator(tenantInput)
  .handler(async ({ data }): Promise<t.KbListResponse> => {
    const response = await apiFetch(withTenant(BASE, data.tenantId));
    if (!response.ok) await extractApiError(response, 'Failed to load the knowledge base');
    return response.json();
  });

/**
 * Upload or replace: the browser sends FormData with `file`, optional `title`, `docType`,
 * `tenantId`, and `documentId` when replacing.
 */
export const uploadKbDocumentFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error('Expected a file upload');
    const file = data.get('file');
    if (!(file instanceof File)) throw new Error('Choose a file to upload');
    return data;
  })
  .handler(async ({ data }): Promise<{ document: t.KbDocument }> => {
    const tenantId = String(data.get('tenantId') ?? '') || undefined;
    const documentId = String(data.get('documentId') ?? '');
    const body = new FormData();
    body.append('file', data.get('file') as File);
    for (const key of ['title', 'docType'] as const) {
      const value = data.get(key);
      if (typeof value === 'string' && value) body.append(key, value);
    }
    const path = documentId ? `${BASE}/${encodeURIComponent(documentId)}/versions` : BASE;
    const response = await apiFetch(withTenant(path, tenantId), { method: 'POST', body });
    if (!response.ok) await extractApiError(response, 'Upload failed');
    return response.json();
  });

export const updateKbDocumentFn = createServerFn({ method: 'POST' })
  .inputValidator(
    documentInput.extend({
      title: z.string().max(300).optional(),
      docType: z.string().max(32).optional(),
    }),
  )
  .handler(async ({ data }): Promise<{ document: t.KbDocument }> => {
    const response = await apiFetch(
      withTenant(`${BASE}/${encodeURIComponent(data.documentId)}`, data.tenantId),
      { method: 'PATCH', body: JSON.stringify({ title: data.title, docType: data.docType }) },
    );
    if (!response.ok) await extractApiError(response, 'Failed to update the document');
    return response.json();
  });

export const retryKbDocumentFn = createServerFn({ method: 'POST' })
  .inputValidator(documentInput)
  .handler(async ({ data }): Promise<{ document: t.KbDocument }> => {
    const response = await apiFetch(
      withTenant(`${BASE}/${encodeURIComponent(data.documentId)}/retry`, data.tenantId),
      { method: 'POST' },
    );
    if (!response.ok) await extractApiError(response, 'Failed to retry the document');
    return response.json();
  });

export const deleteKbDocumentFn = createServerFn({ method: 'POST' })
  .inputValidator(documentInput)
  .handler(async ({ data }): Promise<void> => {
    const response = await apiFetch(
      withTenant(`${BASE}/${encodeURIComponent(data.documentId)}`, data.tenantId),
      { method: 'DELETE' },
    );
    if (!response.ok) await extractApiError(response, 'Failed to delete the document');
  });
