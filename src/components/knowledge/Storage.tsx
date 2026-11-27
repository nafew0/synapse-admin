import { useMemo } from 'react';
import { Database, Files, Layers } from 'lucide-react';
import { Card, EmptyState, LoadingState, StatTile, TrendChart } from '@/components/shared';
import { formatBytes, formatDayLabel } from '@/utils';
import { useKbStorage, useLocalize } from '@/hooks';

/** What one institution's knowledge base takes up on disk now, and its total over 90 days. */
export function StoragePanel({ tenantId }: { tenantId: string }) {
  const localize = useLocalize();
  const query = useKbStorage(tenantId);
  const trend = useMemo(
    () => (query.data?.daily ?? []).map(({ day, totalBytes }) => ({ day, value: totalBytes })),
    [query.data?.daily],
  );

  const body = () => {
    if (query.isLoading) return <LoadingState />;
    if (query.isError || !query.data) {
      return <EmptyState message={query.error?.message || localize('com_kb_storage_failed')} />;
    }
    const { current, days } = query.data;
    return (
      <>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile
            index={0}
            icon={<Database size={16} />}
            label={localize('com_kb_storage_total')}
            value={formatBytes(current.totalBytes)}
            detail={localize('com_kb_storage_split', {
              originals: formatBytes(current.originalBytes),
              parsed: formatBytes(current.parsedBytes),
            })}
          />
          <StatTile
            index={1}
            icon={<Files size={16} />}
            label={localize('com_kb_storage_versions')}
            value={String(current.versions)}
            detail={localize('com_kb_storage_documents', { count: current.documents })}
          />
          <StatTile
            index={2}
            icon={<Layers size={16} />}
            label={localize('com_kb_storage_chunks')}
            value={String(current.indexChunks)}
            detail={localize('com_kb_storage_chunks_detail')}
          />
        </div>
        {trend.length > 1 ? (
          <TrendChart
            data={trend}
            label={localize('com_kb_storage_trend', { days })}
            averageLabel={localize('com_kb_storage_average')}
            formatValue={formatBytes}
            formatDay={formatDayLabel}
            height={180}
          />
        ) : (
          <p className="m-0 text-[13px] text-(--cui-color-text-muted)">
            {localize('com_kb_storage_trend_pending')}
          </p>
        )}
      </>
    );
  };

  return (
    <Card title={localize('com_kb_storage_title')} description={localize('com_kb_storage_desc')}>
      {body()}
    </Card>
  );
}
