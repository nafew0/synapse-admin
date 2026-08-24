import { describe, expect, it } from 'vitest';
import { getConfigAccess } from './access';

describe('getConfigAccess', () => {
  it('allows global mutation only for platform Superadmins', () => {
    const user = { id: '1', email: 'a@example.com', role: 'ADMIN' as const, isPlatformSuperadmin: true };
    expect(getConfigAccess(user, true, true).canMutateGlobal).toBe(true);
    expect(getConfigAccess({ ...user, isPlatformSuperadmin: false }, true, true).canMutateGlobal).toBe(false);
  });

  it('keeps profile mutation independent from global authorization', () => {
    const user = { id: '1', email: 'a@example.com', role: 'ADMIN' as const };
    const access = getConfigAccess(user, true, true);
    expect(access.canMutateProfiles).toBe(true);
    expect(access.denialReason).toBe('superadmin-required');
  });
});
