import { z } from 'zod';
import { createServerFn } from '@tanstack/react-start';
import type * as t from '@/types';
import { apiFetch, extractApiError } from './utils/api';

export const listPlatformInstitutionsFn = createServerFn({ method: 'GET' })
  .inputValidator(
    z
      .object({
        q: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().int().positive().max(100).default(25),
        offset: z.number().int().nonnegative().default(0),
      })
      .optional(),
  )
  .handler(async (context): Promise<t.PlatformInstitutionListResponse> => {
    const data = context?.data;
    const hasQuery = data?.q || data?.status || data?.limit != null || data?.offset != null;
    const params = new URLSearchParams({
      limit: String(data?.limit ?? 25),
      offset: String(data?.offset ?? 0),
    });
    if (data?.q) params.set('q', data.q);
    if (data?.status) params.set('status', data.status);
    const response = await apiFetch(
      hasQuery ? `/api/platform/institutions?${params.toString()}` : '/api/platform/institutions',
    );
    if (!response.ok) {
      await extractApiError(response, 'Failed to fetch institutions');
    }
    return (await response.json()) as t.PlatformInstitutionListResponse;
  });

export const getPlatformInstitutionFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ tenantId: z.string().min(1) }))
  .handler(async ({ data }): Promise<{ institution: t.PlatformInstitution }> => {
    const response = await apiFetch(
      `/api/platform/institutions/${encodeURIComponent(data.tenantId)}`,
    );
    if (!response.ok) await extractApiError(response, 'Failed to fetch institution');
    return (await response.json()) as { institution: t.PlatformInstitution };
  });

export const getPlatformInstitutionQuotaFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ tenantId: z.string().min(1) }))
  .handler(
    async ({
      data,
    }): Promise<{
      policy: t.UsagePolicy;
      health: {
        range: { start: string; end: string; timezone: string };
        buckets: t.UsageBucketHealth[];
        warnings: t.UsageWarning[];
      };
    }> => {
      const response = await apiFetch(
        `/api/platform/institutions/${encodeURIComponent(data.tenantId)}/quota`,
      );
      if (!response.ok) await extractApiError(response, 'Failed to fetch quota health');
      return (await response.json()) as {
        policy: t.UsagePolicy;
        health: {
          range: { start: string; end: string; timezone: string };
          buckets: t.UsageBucketHealth[];
          warnings: t.UsageWarning[];
        };
      };
    },
  );

export const getPlatformInstitutionQuotaReadinessFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ tenantId: z.string().min(1) }))
  .handler(async ({ data }): Promise<t.QuotaReadinessReport> => {
    const response = await apiFetch(
      `/api/platform/institutions/${encodeURIComponent(data.tenantId)}/quota/readiness`,
    );
    if (!response.ok) await extractApiError(response, 'Failed to fetch quota readiness');
    return (await response.json()) as t.QuotaReadinessReport;
  });

export const listPlatformInstitutionPoliciesFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ tenantId: z.string().min(1) }))
  .handler(async ({ data }): Promise<{ policies: t.UsagePolicy[]; total: number }> => {
    const response = await apiFetch(
      `/api/platform/institutions/${encodeURIComponent(data.tenantId)}/policies`,
    );
    if (!response.ok) await extractApiError(response, 'Failed to fetch policy history');
    return (await response.json()) as { policies: t.UsagePolicy[]; total: number };
  });

const policyInput = z.object({
  mode: z.enum(['shadow', 'enforce']),
  timezone: z.string().min(1),
  limits: z.object({
    institutionTokens: z.number().int().nonnegative().nullable(),
    memberTokens: z.number().int().nonnegative().nullable(),
    modelTokens: z.array(
      z.object({
        modelKey: z.string().min(1),
        maxTokens: z.number().int().nonnegative().nullable(),
      }),
    ),
  }),
  warningThresholds: z.array(z.number().gt(0).lt(1)),
});

export const previewPlatformInstitutionPolicyFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ tenantId: z.string().min(1), policy: policyInput }))
  .handler(async ({ data }): Promise<t.UsagePolicyPreview> => {
    const response = await apiFetch(
      `/api/platform/institutions/${encodeURIComponent(data.tenantId)}/policies/preview`,
      { method: 'POST', body: JSON.stringify(data.policy) },
    );
    if (!response.ok) await extractApiError(response, 'Failed to preview policy');
    return (await response.json()) as t.UsagePolicyPreview;
  });

export const createPlatformInstitutionPolicyFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      tenantId: z.string().min(1),
      expectedVersion: z.number().int().nonnegative(),
      policy: policyInput,
      reason: z.string().trim().min(1),
      acknowledgeOverage: z.boolean().default(false),
    }),
  )
  .handler(async ({ data }): Promise<{ policy: t.UsagePolicy; preview: t.UsagePolicyPreview }> => {
    const response = await apiFetch(
      `/api/platform/institutions/${encodeURIComponent(data.tenantId)}/policies`,
      {
        method: 'POST',
        body: JSON.stringify({
          expectedVersion: data.expectedVersion,
          policy: data.policy,
          reason: data.reason,
          acknowledgeOverage: data.acknowledgeOverage,
        }),
      },
    );
    if (!response.ok) await extractApiError(response, 'Failed to create policy');
    return (await response.json()) as { policy: t.UsagePolicy; preview: t.UsagePolicyPreview };
  });

export const createPlatformInstitutionFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      tenantId: z.string().trim().min(1),
      name: z.string().trim().min(1),
      slug: z.string().trim().optional(),
      adminEmail: z.string().email(),
      adminName: z.string().trim().optional(),
      maxActiveMembers: z.number().int().positive().nullable().optional(),
    }),
  )
  .handler(
    async ({
      data,
    }): Promise<{
      institution: t.PlatformInstitution;
      user?: t.PlatformInstitutionAdminResult['user'];
      invite?: t.PlatformInstitutionAdminResult['invite'];
      inviteLink?: string | null;
    }> => {
      const response = await apiFetch('/api/platform/institutions', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: data.tenantId,
          name: data.name,
          slug: data.slug || undefined,
          adminEmail: data.adminEmail || undefined,
          adminName: data.adminName || undefined,
          limits:
            data.maxActiveMembers != null ? { maxActiveMembers: data.maxActiveMembers } : undefined,
        }),
      });
      if (!response.ok) {
        await extractApiError(response, 'Failed to create institution');
      }
      const json = (await response.json()) as {
        institution: t.PlatformInstitution;
        user?: t.PlatformInstitutionAdminResult['user'];
        invite?: t.PlatformInstitutionAdminResult['invite'];
        inviteLink?: string | null;
      };
      return {
        institution: json.institution,
        user: json.user,
        invite: json.invite,
        inviteLink: json.inviteLink ?? null,
      };
    },
  );

export const assignPlatformInstitutionAdminFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      tenantId: z.string().trim().min(1),
      email: z.string().email(),
      name: z.string().trim().optional(),
    }),
  )
  .handler(async ({ data }): Promise<t.PlatformInstitutionAdminResult> => {
    const response = await apiFetch(
      `/api/platform/institutions/${encodeURIComponent(data.tenantId)}/admins`,
      {
        method: 'POST',
        body: JSON.stringify({
          email: data.email,
          name: data.name || undefined,
        }),
      },
    );
    if (!response.ok) {
      await extractApiError(response, 'Failed to assign institution admin');
    }
    const json = (await response.json()) as t.PlatformInstitutionAdminResult;
    return {
      user: json.user,
      invite: json.invite,
      inviteLink: json.inviteLink ?? null,
    };
  });
