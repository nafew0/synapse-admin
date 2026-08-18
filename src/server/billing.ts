import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import type * as t from '@/types';
import { apiFetch, extractApiError } from './utils/api';

export const listCreditPackagesFn = createServerFn({ method: 'GET' }).handler(async (): Promise<{ currency: string; list: t.CreditPackage[] }> => {
  const response = await apiFetch('/api/admin/billing/packages');
  if (!response.ok) await extractApiError(response, 'Failed to fetch credit packages');
  return response.json();
});

export const getUserCreditsFn = createServerFn({ method: 'GET' }).inputValidator(z.object({ userId: z.string(), platform: z.boolean().optional() })).handler(async ({ data }): Promise<t.UserCredits> => {
  const route = data.platform ? `/api/platform/users/${encodeURIComponent(data.userId)}/credits` : `/api/admin/billing/${encodeURIComponent(data.userId)}`;
  const response = await apiFetch(route);
  if (!response.ok) await extractApiError(response, 'Failed to fetch credits');
  return response.json();
});

export const grantCreditsFn = createServerFn({ method: 'POST' }).inputValidator(z.object({ userId: z.string(), packageId: z.string(), reference: z.string().optional(), note: z.string().optional(), platform: z.boolean().optional() })).handler(async ({ data }): Promise<{ balance: number; grant: t.CreditGrant }> => {
  const { userId, platform, ...body } = data;
  const route = platform ? `/api/platform/users/${encodeURIComponent(userId)}/credits/grant` : `/api/admin/billing/${encodeURIComponent(userId)}/grant`;
  const response = await apiFetch(route, { method: 'POST', body: JSON.stringify(body) });
  if (!response.ok) await extractApiError(response, 'Failed to grant credits');
  return response.json();
});
