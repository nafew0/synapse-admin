import { useQuery } from '@tanstack/react-query';
import { getKbStorageFn, listKbStorageFn } from '@/server';

export const KB_STORAGE_QUERY_KEY = ['kbStorage'] as const;
export const KB_STORAGE_DAYS = 90;

export function useKbStorage(tenantId: string, days: number = KB_STORAGE_DAYS) {
  return useQuery({
    queryKey: [...KB_STORAGE_QUERY_KEY, 'institution', tenantId, days],
    queryFn: () => getKbStorageFn({ data: { tenantId, days } }),
  });
}

export function useKbPlatformStorage(days: number = KB_STORAGE_DAYS) {
  return useQuery({
    queryKey: [...KB_STORAGE_QUERY_KEY, 'platform', days],
    queryFn: () => listKbStorageFn({ data: { days } }),
  });
}
