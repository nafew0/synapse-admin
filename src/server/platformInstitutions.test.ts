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
  assignPlatformInstitutionAdminFn,
  createPlatformInstitutionFn,
  getPlatformInstitutionAgentAccessFn,
  listPlatformInstitutionsFn,
  reconcilePlatformInstitutionAgentAccessFn,
  updatePlatformInstitutionAgentAccessFn,
} from './platformInstitutions';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('platform institution server functions', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    extractApiError.mockReset();
  });

  it('fetches platform institutions', async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse(200, { institutions: [] }));

    await listPlatformInstitutionsFn();

    expect(apiFetch).toHaveBeenCalledWith('/api/platform/institutions');
  });

  it('posts institution creation payloads', async () => {
    apiFetch.mockResolvedValueOnce(
      jsonResponse(201, { institution: { tenantId: 'tenant-a', name: 'Tenant A' } }),
    );

    await createPlatformInstitutionFn({
      data: {
        tenantId: 'tenant-a',
        name: 'Tenant A',
        slug: 'tenant-a',
        adminEmail: 'admin@example.com',
        adminName: 'Admin User',
        maxActiveMembers: 25,
      },
    });

    expect(apiFetch).toHaveBeenCalledWith('/api/platform/institutions', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-a',
        name: 'Tenant A',
        slug: 'tenant-a',
        adminEmail: 'admin@example.com',
        adminName: 'Admin User',
        limits: { maxActiveMembers: 25 },
      }),
    });
  });

  it('posts institution-admin assignments by email', async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse(200, { inviteLink: null }));

    await assignPlatformInstitutionAdminFn({
      data: {
        tenantId: 'tenant-a',
        email: 'admin@example.com',
        name: 'Admin User',
      },
    });

    expect(apiFetch).toHaveBeenCalledWith('/api/platform/institutions/tenant-a/admins', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@example.com',
        name: 'Admin User',
      }),
    });
  });

  it('loads tenant agent access without a group selector', async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse(200, { agents: [], audience: null }));

    const result = await getPlatformInstitutionAgentAccessFn({ data: { tenantId: 'tenant a' } });

    expect(apiFetch).toHaveBeenCalledWith('/api/platform/institutions/tenant%20a/agent-access');
    expect(result).toEqual({ agents: [], audience: null });
  });

  it('patches agent access with only the agent and enabled flag', async () => {
    apiFetch.mockResolvedValueOnce(
      jsonResponse(200, {
        tenantId: 'tenant-a',
        agentId: 'agent-1',
        enabled: true,
        audienceGroupId: 'group-1',
        activeMemberCount: 3,
        delegatedAgentCount: 2,
      }),
    );

    await updatePlatformInstitutionAgentAccessFn({
      data: { tenantId: 'tenant-a', agentId: 'agent-1', enabled: true },
    });

    expect(apiFetch).toHaveBeenCalledWith('/api/platform/institutions/tenant-a/agent-access', {
      method: 'PATCH',
      body: JSON.stringify({ agentId: 'agent-1', enabled: true }),
    });
  });

  it('surfaces agent access update errors', async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse(409, { error: 'Conflict' }));
    extractApiError.mockRejectedValueOnce(new Error('Conflict'));

    await expect(
      updatePlatformInstitutionAgentAccessFn({
        data: { tenantId: 'tenant-a', agentId: 'agent-1', enabled: false },
      }),
    ).rejects.toThrow('Conflict');
    expect(extractApiError).toHaveBeenCalledWith(
      expect.any(Response),
      'Failed to update agent access',
    );
  });

  it('posts member reconciliation for the tenant audience', async () => {
    apiFetch.mockResolvedValueOnce(
      jsonResponse(200, {
        tenantId: 'tenant-a',
        audienceGroupId: 'group-1',
        dryRun: false,
        added: 2,
        removed: 1,
        unchanged: 5,
        activeMemberCount: 7,
      }),
    );

    const result = await reconcilePlatformInstitutionAgentAccessFn({
      data: { tenantId: 'tenant-a' },
    });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/platform/institutions/tenant-a/agent-access/reconcile',
      { method: 'POST' },
    );
    expect(result.added).toBe(2);
  });
});
