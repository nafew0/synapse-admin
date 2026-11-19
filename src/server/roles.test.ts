import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.fn();

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
  extractApiError: vi.fn(),
}));

import { allRolesQueryOptions } from './roles';

function rolesPage(roles: Array<{ name: string; tenantId?: string }>, total: number): Response {
  return new Response(
    JSON.stringify({
      roles: roles.map((role) => ({ _id: `${role.name}-${role.tenantId}`, ...role })),
      total,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

function loadAllRoles() {
  return new QueryClient().fetchQuery(allRolesQueryOptions);
}

describe('allRolesQueryOptions', () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it('lists each role once, keeping the global copy over institution copies', async () => {
    apiFetch.mockResolvedValueOnce(
      rolesPage(
        [
          { name: 'ADMIN' },
          { name: 'INSTITUTION_ADMIN', tenantId: 'inst-a' },
          { name: 'INSTITUTION_ADMIN', tenantId: 'inst-b' },
          { name: 'USER' },
          { name: 'USER', tenantId: 'inst-a' },
          { name: 'USER', tenantId: 'inst-b' },
        ],
        6,
      ),
    );

    const roles = await loadAllRoles();

    expect(roles.map((role) => [role.name, role.tenantId])).toEqual([
      ['ADMIN', null],
      ['INSTITUTION_ADMIN', 'inst-a'],
      ['USER', null],
    ]);
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it('pages past the 200-role cap so roles late in the alphabet are not dropped', async () => {
    const institutionCopies = Array.from({ length: 200 }, (_, i) => ({
      name: 'INSTITUTION_ADMIN',
      tenantId: `inst-${i}`,
    }));
    apiFetch
      .mockResolvedValueOnce(rolesPage(institutionCopies, 201))
      .mockResolvedValueOnce(rolesPage([{ name: 'USER' }], 201));

    const roles = await loadAllRoles();

    expect(roles.map((role) => role.name)).toEqual(['INSTITUTION_ADMIN', 'USER']);
    expect(apiFetch).toHaveBeenNthCalledWith(1, '/api/admin/roles?limit=200');
    expect(apiFetch).toHaveBeenNthCalledWith(2, '/api/admin/roles?limit=200&offset=200');
  });
});
