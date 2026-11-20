import { z } from 'zod';
import { createServerFn } from '@tanstack/react-start';
import type * as t from '@/types';
import { apiFetch, extractApiError } from './utils/api';

const BASE = '/api/platform/model-prices';

const tierSchema = z.object({
  minPromptTokens: z.number().int().positive(),
  prompt: z.number().min(0).max(1e5),
  completion: z.number().min(0).max(1e5),
  cacheRead: z.number().min(0).max(1e5).optional(),
  cacheWrite: z.number().min(0).max(1e5).optional(),
  cacheWrite1h: z.number().min(0).max(1e5).optional(),
});

const rate = z.number().min(0).max(1e5).optional();

const priceSchema = z.object({
  prompt: z.number().min(0).max(1e5),
  completion: z.number().min(0).max(1e5),
  cacheRead: rate,
  cacheWrite: rate,
  cacheWrite1h: rate,
  reasoning: rate,
  image: rate,
  imageOutput: rate,
  audio: rate,
  audioOutput: rate,
  webSearch: z.number().min(0).max(1e3).optional(),
  contextLength: z.number().int().positive().optional(),
  tiers: z.array(tierSchema).max(8),
});

const modelSchema = z.object({ modelId: z.string().min(1).max(200) });

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

const modelPath = (modelId: string): string => `${BASE}/${encodeURIComponent(modelId)}`;

export const getModelPricesFn = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      status: z.enum(['ok', 'changed', 'not_listed', 'no_price']).optional(),
      use: z.string().optional(),
      changedDays: z.number().int().min(1).max(365).optional(),
    }),
  )
  .handler(
    async ({ data }): Promise<t.ModelPriceList> =>
      load(`${BASE}${buildQuery(data)}`, 'Failed to load model prices'),
  );

export const getPriceNoticesFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<t.PriceNotice[]> => {
    const body = await load<{ changes: t.PriceNotice[] }>(
      `${BASE}/changes${buildQuery({ seen: 'false', limit: 50 })}`,
      'Failed to load price changes',
    );
    return body.changes;
  },
);

export const getModelPriceFn = createServerFn({ method: 'GET' })
  .inputValidator(modelSchema)
  .handler(
    async ({ data }): Promise<t.ModelPriceDetail> =>
      load(modelPath(data.modelId), 'Failed to load the model price'),
  );

export const getPriceDiffFn = createServerFn({ method: 'GET' })
  .inputValidator(
    modelSchema.extend({ from: z.number().int().min(1), to: z.number().int().min(1) }),
  )
  .handler(
    async ({ data }): Promise<t.PriceDiffResponse> =>
      load(
        `${modelPath(data.modelId)}/diff${buildQuery({ from: data.from, to: data.to })}`,
        'Failed to compare price versions',
      ),
  );

export const markPriceNoticeSeenFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(
    async ({ data }): Promise<{ alreadySeen?: boolean }> =>
      load(
        `${BASE}/changes/${encodeURIComponent(data.id)}/seen`,
        'Failed to mark the change seen',
        { method: 'POST' },
      ),
  );

/** A failed or busy sync is an answer, not an exception: the caller shows which. */
export const syncModelPricesFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<t.PriceSyncOutcome> => {
    const response = await apiFetch(`${BASE}/sync`, { method: 'POST' });
    const body = (await response
      .clone()
      .json()
      .catch(() => ({}))) as {
      result?: t.PriceSyncResult & { error?: string };
      error?: string;
    };
    if (response.ok && body.result) return { ok: true, result: body.result };
    if (response.status === 502 || response.status === 409) {
      return {
        ok: false,
        reason: response.status === 409 ? 'busy' : 'failed',
        message: body.error ?? body.result?.error ?? '',
      };
    }
    return extractApiError(response, 'Failed to sync model prices');
  },
);

export const setPriceOverrideFn = createServerFn({ method: 'POST' })
  .inputValidator(
    modelSchema.extend({
      price: priceSchema,
      reason: z.string().trim().min(3).max(500),
      until: z.string().nullable().optional(),
    }),
  )
  .handler(
    async ({ data }): Promise<{ model: t.ModelPriceRow }> =>
      load(`${modelPath(data.modelId)}/override`, 'Failed to save the manual price', {
        method: 'PUT',
        body: JSON.stringify({ price: data.price, reason: data.reason, until: data.until ?? null }),
      }),
  );

export const clearPriceOverrideFn = createServerFn({ method: 'POST' })
  .inputValidator(modelSchema)
  .handler(
    async ({ data }): Promise<{ model: t.ModelPriceRow | null }> =>
      load(`${modelPath(data.modelId)}/override`, 'Failed to clear the manual price', {
        method: 'DELETE',
      }),
  );
