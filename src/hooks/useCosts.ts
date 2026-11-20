import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type * as t from '@/types';
import {
  getCostInstitutionFn,
  getCostInstitutionsFn,
  getCostRequestsFn,
  getCostServicesFn,
  getCostSettingsFn,
  getCostSummaryFn,
  getCostTimeseriesFn,
  getReconciliationFn,
  refreshProviderFiguresFn,
  saveUnstructuredEntryFn,
  updateCostSettingsFn,
} from '@/server';

export const COSTS_QUERY_KEY = ['costs'] as const;

export function useCostSummary(range: t.DateRange, enabled = true) {
  return useQuery({
    queryKey: [...COSTS_QUERY_KEY, 'summary', range],
    queryFn: () => getCostSummaryFn({ data: range }),
    enabled,
  });
}

export function useCostInstitutions(range: t.DateRange, enabled = true) {
  return useQuery({
    queryKey: [...COSTS_QUERY_KEY, 'institutions', range],
    queryFn: () => getCostInstitutionsFn({ data: range }),
    enabled,
  });
}

export function useCostServices(range: t.DateRange, enabled = true) {
  return useQuery({
    queryKey: [...COSTS_QUERY_KEY, 'services', range],
    queryFn: () => getCostServicesFn({ data: range }),
    enabled,
  });
}

export function useCostTimeseries(range: t.DateRange, groupBy: t.CostGroupBy, enabled = true) {
  return useQuery({
    queryKey: [...COSTS_QUERY_KEY, 'timeseries', groupBy, range],
    queryFn: () => getCostTimeseriesFn({ data: { ...range, groupBy } }),
    enabled,
  });
}

export function useCostInstitution(tenantId: string, range: t.DateRange, enabled = true) {
  return useQuery({
    queryKey: [...COSTS_QUERY_KEY, 'institution', tenantId, range],
    queryFn: () => getCostInstitutionFn({ data: { ...range, tenantId } }),
    enabled,
  });
}

/** The newest rows in the range; the caller ranks them by cost. */
export function useCostRequests(tenantId: string, range: t.DateRange, enabled = true) {
  return useQuery({
    queryKey: [...COSTS_QUERY_KEY, 'requests', tenantId, range],
    queryFn: () => getCostRequestsFn({ data: { ...range, tenantId, limit: 200 } }),
    enabled,
  });
}

export function useCostSettings(enabled = true) {
  return useQuery({
    queryKey: [...COSTS_QUERY_KEY, 'settings'],
    queryFn: () => getCostSettingsFn(),
    enabled,
  });
}

/** Saving settings changes every BDT figure, so the whole costs cache is refetched. */
export function useSaveCostSettings(onDone?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: t.CostSettingsInput) => updateCostSettingsFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COSTS_QUERY_KEY });
      onDone?.();
    },
  });
}

export function useReconciliation(range: t.DateRange, enabled = true) {
  return useQuery({
    queryKey: [...COSTS_QUERY_KEY, 'reconciliation', range],
    queryFn: () => getReconciliationFn({ data: range }),
    enabled,
  });
}

export function useRefreshProviderFigures(onDone?: (result: t.ReconcileRefreshResult) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => refreshProviderFiguresFn(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [...COSTS_QUERY_KEY, 'reconciliation'] });
      onDone?.(result);
    },
  });
}

export function useSaveUnstructuredEntry(onDone?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: t.UnstructuredEntryInput) => saveUnstructuredEntryFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...COSTS_QUERY_KEY, 'reconciliation'] });
      onDone?.();
    },
  });
}
