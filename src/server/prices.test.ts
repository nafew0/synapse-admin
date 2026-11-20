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
  clearPriceOverrideFn,
  getModelPriceFn,
  getModelPricesFn,
  getPriceDiffFn,
  getPriceNoticesFn,
  markPriceNoticeSeenFn,
  setPriceOverrideFn,
  syncModelPricesFn,
} from './prices';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status });

describe('model price server functions', () => {
  beforeEach(() => {
    apiFetch.mockReset().mockImplementation(async () => json({}));
    extractApiError.mockReset();
  });

  it('lists models with the chosen filters', async () => {
    await getModelPricesFn({ data: { status: 'changed', changedDays: 30 } } as never);
    expect(apiFetch.mock.calls[0][0]).toBe(
      '/api/platform/model-prices?status=changed&changedDays=30',
    );
  });

  it('reads unseen notices and unwraps them', async () => {
    apiFetch.mockResolvedValueOnce(json({ changes: [{ _id: 'a' }] }));
    const notices = await getPriceNoticesFn();
    expect(apiFetch.mock.calls[0][0]).toBe(
      '/api/platform/model-prices/changes?seen=false&limit=50',
    );
    expect(notices).toEqual([{ _id: 'a' }]);
  });

  it('percent-encodes the slash in a model id', async () => {
    await getModelPriceFn({ data: { modelId: 'anthropic/claude-haiku-5.5' } } as never);
    expect(apiFetch.mock.calls[0][0]).toBe(
      '/api/platform/model-prices/anthropic%2Fclaude-haiku-5.5',
    );
    await getPriceDiffFn({ data: { modelId: 'a/b', from: 1, to: 3 } } as never);
    expect(apiFetch.mock.calls[1][0]).toBe('/api/platform/model-prices/a%2Fb/diff?from=1&to=3');
  });

  it('marks a notice seen with a POST', async () => {
    await markPriceNoticeSeenFn({ data: { id: 'abc' } } as never);
    expect(apiFetch.mock.calls[0]).toEqual([
      '/api/platform/model-prices/changes/abc/seen',
      { method: 'POST' },
    ]);
  });

  it('sets and clears an override', async () => {
    const price = { prompt: 1, completion: 2, tiers: [] };
    await setPriceOverrideFn({ data: { modelId: 'a/b', price, reason: 'deal' } } as never);
    const [path, init] = apiFetch.mock.calls[0];
    expect(path).toBe('/api/platform/model-prices/a%2Fb/override');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ price, reason: 'deal', until: null });
    await clearPriceOverrideFn({ data: { modelId: 'a/b' } } as never);
    expect(apiFetch.mock.calls[1]).toEqual([
      '/api/platform/model-prices/a%2Fb/override',
      { method: 'DELETE' },
    ]);
  });

  it('returns a sync result, and failure or a busy server as an answer', async () => {
    apiFetch.mockResolvedValueOnce(
      json({ result: { ok: true, models: 3, changed: 1, notListed: 0 } }),
    );
    expect(await syncModelPricesFn()).toEqual({
      ok: true,
      result: { ok: true, models: 3, changed: 1, notListed: 0 },
    });
    apiFetch.mockResolvedValueOnce(json({ result: { ok: false } }, 502));
    expect(await syncModelPricesFn()).toMatchObject({ ok: false, reason: 'failed' });
    apiFetch.mockResolvedValueOnce(json({ error: 'busy', result: {} }, 409));
    expect(await syncModelPricesFn()).toMatchObject({ ok: false, reason: 'busy', message: 'busy' });
  });

  it('raises other sync errors through the shared extractor', async () => {
    apiFetch.mockResolvedValueOnce(json({ error: 'Forbidden' }, 403));
    extractApiError.mockRejectedValueOnce(new Error('Forbidden'));
    await expect(syncModelPricesFn()).rejects.toThrow('Forbidden');
  });
});
