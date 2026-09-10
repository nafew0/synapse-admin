import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import type * as t from '@/types';
import { apiFetch, extractApiError } from './utils/api';

const bannerIdInput = z.object({ bannerId: z.string().min(1).max(128) });

async function recordBannerView(bannerId: string, action: 'seen' | 'dismiss'): Promise<void> {
  const response = await apiFetch(`/api/banner/${encodeURIComponent(bannerId)}/${action}`, {
    method: 'POST',
  });
  if (!response.ok) await extractApiError(response, 'Failed to update banner');
}

/** The same announcement the chat app shows, already filtered for this user's seen/dismissed state. */
export const getBannerFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<t.Banner | null> => {
    const response = await apiFetch('/api/banner');
    if (!response.ok) await extractApiError(response, 'Failed to fetch banner');
    return response.json();
  },
);

export const markBannerSeenFn = createServerFn({ method: 'POST' })
  .inputValidator(bannerIdInput)
  .handler(async ({ data }) => recordBannerView(data.bannerId, 'seen'));

export const dismissBannerFn = createServerFn({ method: 'POST' })
  .inputValidator(bannerIdInput)
  .handler(async ({ data }) => recordBannerView(data.bannerId, 'dismiss'));
