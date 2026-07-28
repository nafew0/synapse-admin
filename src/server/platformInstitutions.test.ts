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
  listPlatformInstitutionsFn,
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
});
