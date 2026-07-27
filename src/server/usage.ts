import { z } from 'zod';
import { createServerFn } from '@tanstack/react-start';
import type * as t from '@/types';
import { apiFetch, extractApiError } from './utils/api';

const usageFilterSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
});

const usageListSchema = usageFilterSchema.extend({
  query: z.string().optional(),
  limit: z.number().int().positive().max(100).default(10),
  offset: z.number().int().min(0).default(0),
});

function buildQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') {
      return;
    }
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export const getUsageSummaryFn = createServerFn({ method: 'GET' })
  .inputValidator(usageFilterSchema)
  .handler(async ({ data }): Promise<{ range: t.UsageRange; summary: t.UsageSummary }> => {
    const response = await apiFetch(
      `/api/admin/usage/summary${buildQuery({ start: data.start, end: data.end })}`,
    );
    if (!response.ok) {
      await extractApiError(response, 'Failed to fetch usage summary');
    }
    return (await response.json()) as { range: t.UsageRange; summary: t.UsageSummary };
  });

export const getUsageMembersFn = createServerFn({ method: 'GET' })
  .inputValidator(usageListSchema)
  .handler(
    async ({
      data,
    }): Promise<{
      range: t.UsageRange;
      members: t.MemberUsageRow[];
      total: number;
      limit: number;
      offset: number;
    }> => {
      const response = await apiFetch(
        `/api/admin/usage/members${buildQuery({
          start: data.start,
          end: data.end,
          q: data.query?.trim(),
          limit: data.limit,
          offset: data.offset,
        })}`,
      );
      if (!response.ok) {
        await extractApiError(response, 'Failed to fetch member usage');
      }
      return (await response.json()) as {
        range: t.UsageRange;
        members: t.MemberUsageRow[];
        total: number;
        limit: number;
        offset: number;
      };
    },
  );

export const getUsageModelsFn = createServerFn({ method: 'GET' })
  .inputValidator(usageListSchema)
  .handler(
    async ({
      data,
    }): Promise<{
      range: t.UsageRange;
      models: t.ModelUsageRow[];
      total: number;
      limit: number;
      offset: number;
    }> => {
      const response = await apiFetch(
        `/api/admin/usage/models${buildQuery({
          start: data.start,
          end: data.end,
          q: data.query?.trim(),
          limit: data.limit,
          offset: data.offset,
        })}`,
      );
      if (!response.ok) {
        await extractApiError(response, 'Failed to fetch model usage');
      }
      return (await response.json()) as {
        range: t.UsageRange;
        models: t.ModelUsageRow[];
        total: number;
        limit: number;
        offset: number;
      };
    },
  );

export const getUsageTimeseriesFn = createServerFn({ method: 'GET' })
  .inputValidator(usageFilterSchema)
  .handler(async ({ data }): Promise<{ range: t.UsageRange; points: t.UsageTimeseriesPoint[] }> => {
    const response = await apiFetch(
      `/api/admin/usage/timeseries${buildQuery({ start: data.start, end: data.end })}`,
    );
    if (!response.ok) {
      await extractApiError(response, 'Failed to fetch usage timeseries');
    }
    return (await response.json()) as { range: t.UsageRange; points: t.UsageTimeseriesPoint[] };
  });

export const exportUsageCsvServerFn = createServerFn({ method: 'POST' })
  .inputValidator(usageFilterSchema)
  .handler(async ({ data }): Promise<Response> => {
    const response = await apiFetch(
      `/api/admin/usage/export.csv${buildQuery({ start: data.start, end: data.end })}`,
      {
        method: 'GET',
        headers: { Accept: 'text/csv' },
      },
    );
    if (!response.ok) {
      await extractApiError(response, 'Failed to export usage CSV');
    }
    const filename = `usage-${new Date().toISOString().slice(0, 10)}.csv`;
    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  });
