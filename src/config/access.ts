import type { SerializableUser } from '@/types';

export interface ConfigAccess {
  canReadGlobal: boolean;
  canMutateGlobal: boolean;
  canMutateProfiles: boolean;
  denialReason: 'superadmin-required' | 'config-read-required' | null;
}

export function getConfigAccess(
  user: SerializableUser | null | undefined,
  canReadGlobal: boolean,
  canMutateProfiles: boolean,
): ConfigAccess {
  const isSuperadmin = user?.isPlatformSuperadmin === true;
  return {
    canReadGlobal,
    canMutateGlobal: isSuperadmin,
    canMutateProfiles,
    denialReason: !canReadGlobal ? 'config-read-required' : !isSuperadmin ? 'superadmin-required' : null,
  };
}
