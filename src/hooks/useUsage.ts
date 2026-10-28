import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type * as t from '@/types';
import { getUsageMembersFn, getUsageModelsFn, getUsageSummaryFn, getUsageTimeseriesFn } from '@/server';

interface UsageScope extends t.DateRange {
  /** Required for platform superadmins, who have no tenant of their own. */
  tenantId?: string;
}

interface UsageListScope extends UsageScope {
  query?: string;
  limit: number;
  offset: number;
}

export function useUsageSummary(scope: UsageScope, enabled = true) {
  return useQuery({
    queryKey: ['usage-summary', scope],
    queryFn: () => getUsageSummaryFn({ data: scope }),
    enabled,
  });
}

export function useUsageTimeseries(scope: UsageScope, enabled = true) {
  return useQuery({
    queryKey: ['usage-timeseries', scope],
    queryFn: () => getUsageTimeseriesFn({ data: scope }),
    enabled,
  });
}

export function useUsageMembers(scope: UsageListScope, enabled = true) {
  return useQuery({
    queryKey: ['usage-members', scope],
    queryFn: () => getUsageMembersFn({ data: scope }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useUsageModels(scope: UsageListScope, enabled = true) {
  return useQuery({
    queryKey: ['usage-models', scope],
    queryFn: () => getUsageModelsFn({ data: scope }),
    placeholderData: keepPreviousData,
    enabled,
  });
}
