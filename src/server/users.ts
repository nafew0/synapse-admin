import { z } from 'zod';
import { createServerFn } from '@tanstack/react-start';
import type * as t from '@/types';
import { apiFetch, extractApiError } from './utils/api';

const memberRoleSchema = z.enum([
  'USER',
  'INSTITUTION_ADMIN',
  'INSTITUTION_MEMBER',
  'STANDALONE_USER',
]);
const memberStatusSchema = z.enum(['active', 'suspended', 'removed', 'invited', 'expired']);

const listMembersInput = z.object({
  limit: z.number().int().positive().max(100).default(25),
  offset: z.number().int().min(0).default(0),
  query: z.string().optional(),
  status: memberStatusSchema.or(z.literal('all')).optional(),
  role: memberRoleSchema.or(z.literal('all')).optional(),
  platform: z.boolean().optional(),
  tenantId: z.string().optional(),
  accountScope: z.enum(['all', 'institution', 'standalone']).optional(),
});

export const listStandaloneCreditPackagesFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ currency: string; list: t.CreditPackage[] }> => {
    const response = await apiFetch('/api/platform/users/standalone/packages');
    if (!response.ok) await extractApiError(response, 'Failed to fetch individual packages');
    return (await response.json()) as { currency: string; list: t.CreditPackage[] };
  },
);

export const createStandaloneInviteFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      email: z.string().email(),
      username: z.string().trim().min(2).max(80).optional(),
      creditPackageId: z.string().min(1),
    }),
  )
  .handler(async ({ data }): Promise<t.StandaloneInviteResponse> => {
    const response = await apiFetch('/api/platform/users/standalone/invites', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) await extractApiError(response, 'Failed to invite individual user');
    return (await response.json()) as t.StandaloneInviteResponse;
  });

function toQueryString(input: z.infer<typeof listMembersInput>): string {
  const params = new URLSearchParams();
  params.set('limit', String(input.limit));
  params.set('offset', String(input.offset));
  if (input.query?.trim()) {
    params.set('q', input.query.trim());
  }
  if (input.status && input.status !== 'all') {
    params.set('status', input.status);
  }
  if (input.role && input.role !== 'all') {
    params.set('role', input.role);
  }
  if (input.tenantId?.trim()) {
    params.set('tenantId', input.tenantId.trim());
  }
  if (input.accountScope && input.accountScope !== 'institution')
    params.set('accountScope', input.accountScope);
  return params.toString();
}

export const getMembersFn = createServerFn({ method: 'GET' })
  .inputValidator(listMembersInput)
  .handler(async ({ data }): Promise<t.InstitutionMemberListResponse> => {
    const route = data.platform ? '/api/platform/users' : '/api/admin/users';
    const response = await apiFetch(`${route}?${toQueryString(data)}`);
    if (!response.ok) {
      await extractApiError(response, 'Failed to fetch members');
    }
    return (await response.json()) as t.InstitutionMemberListResponse;
  });

export const getUserDetailFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ userId: z.string(), platform: z.boolean().optional() }))
  .handler(async ({ data }): Promise<{ member: t.InstitutionMember }> => {
    const route = data.platform ? '/api/platform/users' : '/api/admin/users';
    const response = await apiFetch(`${route}/${encodeURIComponent(data.userId)}`);
    if (!response.ok) await extractApiError(response, 'Failed to fetch user details');
    return (await response.json()) as { member: t.InstitutionMember };
  });

export const getUserUsageFn = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      userId: z.string(),
      platform: z.boolean().optional(),
      start: z.string().optional(),
      end: z.string().optional(),
    }),
  )
  .handler(async ({ data }): Promise<t.UserUsageResponse> => {
    const route = data.platform ? '/api/platform/users' : '/api/admin/users';
    const params = new URLSearchParams();
    if (data.start) params.set('start', data.start);
    if (data.end) params.set('end', data.end);
    const query = params.toString();
    const response = await apiFetch(
      `${route}/${encodeURIComponent(data.userId)}/usage${query ? `?${query}` : ''}`,
    );
    if (!response.ok) await extractApiError(response, 'Failed to fetch user usage');
    return (await response.json()) as t.UserUsageResponse;
  });

export const inviteMemberFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      name: z.string().trim().min(1),
      email: z.string().email(),
      role: memberRoleSchema,
      creditPackageId: z.string().min(1).optional(),
    }),
  )
  .handler(async ({ data }): Promise<{ inviteLink?: string | null }> => {
    const response = await apiFetch('/api/admin/users/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      await extractApiError(response, 'Failed to invite member');
    }
    const json = (await response.json()) as { inviteLink?: string | null };
    return { inviteLink: json.inviteLink ?? null };
  });

export const resendInviteFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      inviteId: z.string(),
      tenantId: z.string().optional(),
      platform: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }): Promise<{ inviteLink?: string | null }> => {
    const route = data.platform
      ? data.tenantId
        ? '/api/platform/users'
        : '/api/platform/users/standalone'
      : '/api/admin/users';
    const response = await apiFetch(
      `${route}/invites/${encodeURIComponent(data.inviteId)}/resend`,
      {
        method: 'POST',
        body: data.platform ? JSON.stringify({ tenantId: data.tenantId }) : undefined,
      },
    );
    if (!response.ok) {
      await extractApiError(response, 'Failed to resend invitation');
    }
    const json = (await response.json()) as { inviteLink?: string | null };
    return { inviteLink: json.inviteLink ?? null };
  });

export const revokeInviteFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      inviteId: z.string(),
      tenantId: z.string().optional(),
      platform: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const route = data.platform
      ? data.tenantId
        ? '/api/platform/users'
        : '/api/platform/users/standalone'
      : '/api/admin/users';
    const response = await apiFetch(
      `${route}/invites/${encodeURIComponent(data.inviteId)}/revoke`,
      {
        method: 'POST',
        body: data.platform ? JSON.stringify({ tenantId: data.tenantId }) : undefined,
      },
    );
    if (!response.ok) {
      await extractApiError(response, 'Failed to revoke invitation');
    }
  });

export const suspendMemberFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      userId: z.string(),
      tenantId: z.string().optional(),
      platform: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const route = data.platform ? '/api/platform/users' : '/api/admin/users';
    const response = await apiFetch(`${route}/${encodeURIComponent(data.userId)}/suspend`, {
      method: 'POST',
      body: data.platform ? JSON.stringify({ tenantId: data.tenantId }) : undefined,
    });
    if (!response.ok) {
      await extractApiError(response, 'Failed to suspend member');
    }
  });

export const reactivateMemberFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      userId: z.string(),
      tenantId: z.string().optional(),
      platform: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const route = data.platform ? '/api/platform/users' : '/api/admin/users';
    const response = await apiFetch(`${route}/${encodeURIComponent(data.userId)}/reactivate`, {
      method: 'POST',
      body: data.platform ? JSON.stringify({ tenantId: data.tenantId }) : undefined,
    });
    if (!response.ok) {
      await extractApiError(response, 'Failed to reactivate member');
    }
  });

export const removeMemberFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      userId: z.string(),
      tenantId: z.string().optional(),
      platform: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const route = data.platform ? '/api/platform/users' : '/api/admin/users';
    const response = await apiFetch(`${route}/${encodeURIComponent(data.userId)}/remove`, {
      method: 'POST',
      body: data.platform ? JSON.stringify({ tenantId: data.tenantId }) : undefined,
    });
    if (!response.ok) {
      await extractApiError(response, 'Failed to remove member');
    }
  });

export const changeMemberRoleFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      userId: z.string(),
      role: memberRoleSchema,
      tenantId: z.string().optional(),
      platform: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const route = data.platform ? '/api/platform/users' : '/api/admin/users';
    const response = await apiFetch(`${route}/${encodeURIComponent(data.userId)}/role`, {
      method: 'POST',
      body: JSON.stringify({
        role: data.role,
        ...(data.platform ? { tenantId: data.tenantId } : null),
      }),
    });
    if (!response.ok) {
      await extractApiError(response, 'Failed to update member role');
    }
  });

export const resendMemberVerificationFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      userId: z.string(),
      tenantId: z.string(),
      platform: z.literal(true),
    }),
  )
  .handler(async ({ data }) => {
    const response = await apiFetch(
      `/api/platform/users/${encodeURIComponent(data.userId)}/resend-verification`,
      {
        method: 'POST',
        body: JSON.stringify({ tenantId: data.tenantId }),
      },
    );
    if (!response.ok) {
      await extractApiError(response, 'Failed to resend verification email');
    }
  });

export const dryRunMemberImportFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ csvText: z.string().min(1) }))
  .handler(
    async ({
      data,
    }): Promise<{
      summary: t.InstitutionImportSummary;
      results: t.InstitutionImportRowResult[];
    }> => {
      const response = await apiFetch('/api/admin/users/invites/import/dry-run', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        await extractApiError(response, 'Failed to validate CSV import');
      }
      return (await response.json()) as {
        summary: t.InstitutionImportSummary;
        results: t.InstitutionImportRowResult[];
      };
    },
  );

export const createMemberImportFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ csvText: z.string().min(1) }))
  .handler(async ({ data }): Promise<{ job: t.InstitutionImportJob }> => {
    const response = await apiFetch('/api/admin/users/invites/import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      await extractApiError(response, 'Failed to start CSV import');
    }
    return (await response.json()) as { job: t.InstitutionImportJob };
  });

export const getMemberImportJobFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ jobId: z.string() }))
  .handler(async ({ data }): Promise<{ job: t.InstitutionImportJob }> => {
    const response = await apiFetch(`/api/admin/users/imports/${encodeURIComponent(data.jobId)}`);
    if (!response.ok) {
      await extractApiError(response, 'Failed to fetch import job');
    }
    return (await response.json()) as { job: t.InstitutionImportJob };
  });

export const searchUsersFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ query: z.string() }))
  .handler(
    async ({
      data,
    }): Promise<{
      users: Array<{ id: string; name: string; email: string; username?: string }>;
    }> => {
      const response = await apiFetch(
        `/api/admin/users/search?q=${encodeURIComponent(data.query)}&limit=20`,
      );
      if (!response.ok) {
        await extractApiError(response, 'Failed to search users');
      }
      const json = (await response.json()) as { members: t.InstitutionMember[] };
      return {
        users: (json.members ?? [])
          .filter((member) => member.kind === 'user')
          .map((member) => ({
            id: member.id,
            name: member.name,
            email: member.email,
          })),
      };
    },
  );
