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
  changeMemberRoleFn,
  createMemberImportFn,
  dryRunMemberImportFn,
  getUserDetailFn,
  getUserUsageFn,
  getMembersFn,
  inviteMemberFn,
  resendMemberVerificationFn,
} from './users';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('member admin server functions', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    extractApiError.mockReset();
  });

  it('fetches paginated member lists with query parameters', async () => {
    apiFetch.mockResolvedValueOnce(
      jsonResponse(200, {
        members: [],
        total: 0,
        limit: 25,
        offset: 0,
        summary: { activeMembers: 0, maxActiveMembers: 3, pendingInvites: 0 },
      }),
    );

    await getMembersFn({
      data: {
        limit: 25,
        offset: 0,
        query: 'ada',
        status: 'active',
        role: 'INSTITUTION_ADMIN',
      },
    });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/admin/users?limit=25&offset=0&q=ada&status=active&role=INSTITUTION_ADMIN',
    );
  });

  it('fetches the cross-institution directory for a platform superadmin', async () => {
    apiFetch.mockResolvedValueOnce(
      jsonResponse(200, {
        members: [],
        total: 0,
        limit: 25,
        offset: 0,
        summary: { activeMembers: 0, pendingInvites: 0, institutions: 1 },
      }),
    );

    await getMembersFn({
      data: {
        limit: 25,
        offset: 0,
        platform: true,
        tenantId: 'tenant-a',
        status: 'expired',
      },
    });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/platform/users?limit=25&offset=0&status=expired&tenantId=tenant-a',
    );
  });

  it('resends verification for an accepted tenant member from the platform directory', async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse(200, { message: 'Verification email sent' }));

    await resendMemberVerificationFn({
      data: {
        userId: 'member-1',
        tenantId: 'tenant-a',
        platform: true,
      },
    });

    expect(apiFetch).toHaveBeenCalledWith('/api/platform/users/member-1/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ tenantId: 'tenant-a' }),
    });
  });

  it('posts invite requests to the tenant member invite endpoint', async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse(201, { inviteLink: null }));

    await inviteMemberFn({
      data: {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        role: 'INSTITUTION_ADMIN',
      },
    });

    expect(apiFetch).toHaveBeenCalledWith('/api/admin/users/invite', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        role: 'INSTITUTION_ADMIN',
      }),
    });
  });

  it('posts dry-run CSV payloads to the import preview endpoint', async () => {
    apiFetch.mockResolvedValueOnce(
      jsonResponse(200, {
        summary: { totalRows: 1, invitesCreated: 1, membersUpdated: 0, skipped: 0, errors: 0 },
        results: [],
      }),
    );

    await dryRunMemberImportFn({ data: { csvText: 'email,name\nada@example.com,Ada' } });

    expect(apiFetch).toHaveBeenCalledWith('/api/admin/users/invites/import/dry-run', {
      method: 'POST',
      body: JSON.stringify({ csvText: 'email,name\nada@example.com,Ada' }),
    });
  });

  it('posts CSV payloads to create import jobs', async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse(201, { job: { id: 'job-1' } }));

    await createMemberImportFn({ data: { csvText: 'email\nada@example.com' } });

    expect(apiFetch).toHaveBeenCalledWith('/api/admin/users/invites/import', {
      method: 'POST',
      body: JSON.stringify({ csvText: 'email\nada@example.com' }),
    });
  });

  it('posts role changes to the member role endpoint', async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse(200, { member: { id: 'member-1' } }));

    await changeMemberRoleFn({ data: { userId: 'member-1', role: 'USER' } });

    expect(apiFetch).toHaveBeenCalledWith('/api/admin/users/member-1/role', {
      method: 'POST',
      body: JSON.stringify({ role: 'USER' }),
    });
  });

  it('loads platform user details and usage with the user id', async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse(200, { member: { id: 'user-1' } }));
    await getUserDetailFn({ data: { userId: 'user-1', platform: true } });
    expect(apiFetch).toHaveBeenCalledWith('/api/platform/users/user-1');

    apiFetch.mockResolvedValueOnce(jsonResponse(200, { summary: {}, models: [], range: {} }));
    await getUserUsageFn({
      data: { userId: 'user-1', platform: true, start: '2026-07-01', end: '2026-08-01' },
    });
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/platform/users/user-1/usage?start=2026-07-01&end=2026-08-01',
    );
  });
});
