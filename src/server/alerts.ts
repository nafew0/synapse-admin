import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import type * as t from '@/types';
import { apiFetch, extractApiError } from './utils/api';

const BASE = '/api/platform/alerts';

async function send<T>(path: string, init: RequestInit, fallback: string): Promise<T> {
  const response = await apiFetch(path, init);
  if (!response.ok) await extractApiError(response, fallback);
  return response.json();
}

export const listAlertsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<t.PlatformAlertList> => send(BASE, {}, 'Failed to load alerts'),
);

/** Marks one alert seen, or every open alert when no id is given. */
export const markAlertsSeenFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ alertId: z.string().min(1).optional() }))
  .handler(
    async ({ data }): Promise<{ changed: number }> =>
      send(
        data.alertId ? `${BASE}/${encodeURIComponent(data.alertId)}/seen` : `${BASE}/seen`,
        { method: 'POST' },
        'Failed to mark alerts as seen',
      ),
  );

/** Runs the provider checks now instead of waiting for the next scheduled pass. */
export const checkAlertsFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<t.PlatformAlertList> =>
    send(`${BASE}/check`, { method: 'POST' }, 'Failed to run alert checks'),
);
