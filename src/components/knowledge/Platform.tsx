import { Link } from '@tanstack/react-router';
import { Card, EmptyState, LoadingState, Sparkline } from '@/components/shared';
import { useKbPlatformStorage, useLocalize } from '@/hooks';
import { formatBytes } from '@/utils';

/** Superadmin: every institution's knowledge base disk use, largest first, with its trend. */
export function KbStorageTable() {
  const localize = useLocalize();
  const query = useKbPlatformStorage();

  const body = () => {
    if (query.isLoading) return <LoadingState />;
    if (query.isError || !query.data) {
      return <EmptyState message={query.error?.message || localize('com_kb_storage_failed')} />;
    }
    const { institutions, totals } = query.data;
    const stored = institutions.filter((row) => row.current.versions > 0);
    if (stored.length === 0) {
      return <EmptyState message={localize('com_kb_storage_empty')} />;
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-160 border-collapse text-left text-[13px] tabular-nums">
          <thead>
            <tr className="text-xs text-(--cui-color-text-muted)">
              <th scope="col" className="py-2 pr-4 font-medium">
                {localize('com_costs_institution')}
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                {localize('com_kb_storage_col_documents')}
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                {localize('com_kb_storage_col_versions')}
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                {localize('com_kb_storage_col_total')}
              </th>
              <th scope="col" className="py-2 font-medium">
                {localize('com_kb_storage_col_trend')}
              </th>
            </tr>
          </thead>
          <tbody>
            {stored.map((row) => (
              <tr key={row.tenantId} className="border-t border-(--cui-color-stroke-muted)">
                <td className="py-2 pr-4">
                  <Link
                    to="/institutions/$tenantId"
                    params={{ tenantId: row.tenantId }}
                    className="text-(--syn-brand-ink) hover:underline"
                  >
                    {row.name ?? row.tenantId}
                  </Link>
                </td>
                <td className="py-2 pr-4 text-right">{row.current.documents}</td>
                <td className="py-2 pr-4 text-right">{row.current.versions}</td>
                <td className="py-2 pr-4 text-right">
                  <span className="font-semibold">{formatBytes(row.current.totalBytes)}</span>
                  <span className="block text-xs text-(--cui-color-text-muted)">
                    {localize('com_kb_storage_split', {
                      originals: formatBytes(row.current.originalBytes),
                      parsed: formatBytes(row.current.parsedBytes),
                    })}
                  </span>
                </td>
                <td className="py-2">
                  <Sparkline values={row.trend.map((point) => point.totalBytes)} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-(--cui-color-stroke-default) font-semibold">
              <td className="py-2 pr-4">{localize('com_kb_storage_all')}</td>
              <td className="py-2 pr-4 text-right">{totals.documents}</td>
              <td className="py-2 pr-4 text-right">{totals.versions}</td>
              <td className="py-2 pr-4 text-right">{formatBytes(totals.totalBytes)}</td>
              <td className="py-2" />
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  return (
    <Card
      title={localize('com_kb_storage_platform_title')}
      description={localize('com_kb_storage_platform_desc')}
    >
      {body()}
    </Card>
  );
}
