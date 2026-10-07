import { useQueries, useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import type * as t from '@/types';
import { SystemCapabilities } from '@/constants';
import { useCapabilities } from './useCapabilities';
import { getMembersFn } from '@/server';

const Route = getRouteApi('/_app');

const COUNTED_STATUSES = ['active', 'invited', 'expired', 'suspended'] as const;

/** Institution-scoped member views only; platform superadmins have no single seat pool. */
function useInstitutionMembersEnabled(): boolean {
  const { user } = Route.useRouteContext();
  const { hasCapability } = useCapabilities();
  return user?.isPlatformSuperadmin !== true && hasCapability(SystemCapabilities.READ_USERS);
}

/** Seat usage for the signed-in admin's institution, shared by every view that shows it. */
export function useMemberSummary(): t.InstitutionSeatSummary | undefined {
  const enabled = useInstitutionMembersEnabled();
  const query = useQuery({
    queryKey: ['members', 'summary'],
    queryFn: () => getMembersFn({ data: { limit: 1, offset: 0 } }),
    enabled,
    staleTime: 60_000,
  });
  return query.data?.summary;
}

/**
 * The member list returns a `total` for whichever status it is filtered by,
 * so each tab count is one single-row request.
 */
export function useMemberStatusCounts(): Partial<Record<t.StatusFilter, number>> {
  const enabled = useInstitutionMembersEnabled();
  const results = useQueries({
    queries: COUNTED_STATUSES.map((status) => ({
      queryKey: ['members', 'count', status],
      queryFn: () => getMembersFn({ data: { limit: 1, offset: 0, status } }),
      enabled,
      staleTime: 60_000,
    })),
  });
  const counts: Partial<Record<t.StatusFilter, number>> = {};
  let all = 0;
  let complete = true;
  for (let i = 0; i < COUNTED_STATUSES.length; i++) {
    const total = results[i].data?.total;
    if (total == null) {
      complete = false;
      continue;
    }
    counts[COUNTED_STATUSES[i]] = total;
    all += total;
  }
  if (complete) {
    counts.all = all;
  }
  return counts;
}
