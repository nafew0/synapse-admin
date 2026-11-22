import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type * as t from '@/types';
import {
  clearPriceOverrideFn,
  getModelPriceFn,
  getModelPricesFn,
  getPriceDiffFn,
  getPriceNoticesFn,
  markPriceNoticeSeenFn,
  setPriceOverrideFn,
  syncModelPricesFn,
} from '@/server';

export const PRICES_QUERY_KEY = ['model-prices'] as const;

export function useModelPrices(filter: t.ModelPriceListFilter) {
  return useQuery({
    queryKey: [...PRICES_QUERY_KEY, 'list', filter],
    queryFn: () => getModelPricesFn({ data: filter }),
  });
}

export function usePriceNotices() {
  return useQuery({
    queryKey: [...PRICES_QUERY_KEY, 'notices'],
    queryFn: () => getPriceNoticesFn(),
  });
}

export function useModelPrice(modelId: string | null) {
  return useQuery({
    queryKey: [...PRICES_QUERY_KEY, 'detail', modelId],
    queryFn: () => getModelPriceFn({ data: { modelId: modelId ?? '' } }),
    enabled: modelId != null,
  });
}

/** Compares two stored versions; stays idle until both are picked and differ. */
export function usePriceDiff(modelId: string, from: number | null, to: number | null) {
  const ready = from != null && to != null && from !== to;
  return useQuery({
    queryKey: [...PRICES_QUERY_KEY, 'diff', modelId, from, to],
    queryFn: () => getPriceDiffFn({ data: { modelId, from: from ?? 1, to: to ?? 1 } }),
    enabled: ready,
  });
}

/** Any price write changes the list, the notices and the open drawer, so all refetch. */
function useRefreshPrices() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: PRICES_QUERY_KEY });
}

export function useMarkNoticeSeen() {
  const refresh = useRefreshPrices();
  return useMutation({
    mutationFn: (id: string) => markPriceNoticeSeenFn({ data: { id } }),
    onSuccess: refresh,
  });
}

export function useSyncPrices(onDone?: (outcome: t.PriceSyncOutcome) => void) {
  const refresh = useRefreshPrices();
  return useMutation({
    mutationFn: () => syncModelPricesFn(),
    onSuccess: (outcome) => {
      refresh();
      onDone?.(outcome);
    },
  });
}

export function useSetOverride(onDone?: () => void) {
  const refresh = useRefreshPrices();
  return useMutation({
    mutationFn: (data: t.PriceOverrideInput) => setPriceOverrideFn({ data }),
    onSuccess: () => {
      refresh();
      onDone?.();
    },
  });
}

export function useClearOverride(onDone?: () => void) {
  const refresh = useRefreshPrices();
  return useMutation({
    mutationFn: (modelId: string) => clearPriceOverrideFn({ data: { modelId } }),
    onSuccess: () => {
      refresh();
      onDone?.();
    },
  });
}
