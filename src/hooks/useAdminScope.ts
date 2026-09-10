import { getRouteApi } from '@tanstack/react-router';

const Route = getRouteApi('/_app');

export interface AdminScope {
  isPlatformSuperadmin: boolean;
  /** Mirrors the server rule: cost and provider detail reach platform
   *  superadmins only, and the API omits those fields for everyone else. */
  canViewBillingDetail: boolean;
}

export function useAdminScope(): AdminScope {
  const { user } = Route.useRouteContext();
  const isPlatformSuperadmin = user?.isPlatformSuperadmin === true;

  return { isPlatformSuperadmin, canViewBillingDetail: isPlatformSuperadmin };
}
