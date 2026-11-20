import { useState } from 'react';
import { Download } from 'lucide-react';
import type * as t from '@/types';
import { datedFilename, downloadBlob, filenameFromDisposition, notifyError } from '@/utils';
import { RangePicker } from '@/components/shared';
import { exportCostCsvFn } from '@/server';
import { useLocalize } from '@/hooks';
import { COST_PRESETS } from './useCostRange';

const SHEETS: t.CostExportSheet[] = ['institutions', 'members', 'daily'];

interface FiltersProps {
  preset: t.RangePreset;
  onPreset: (preset: t.RangePreset) => void;
  range: t.DateRange;
}

/** Period picker and the CSV export for the period on screen. */
export function CostFilters({ preset, onPreset, range }: FiltersProps) {
  const localize = useLocalize();
  const [sheet, setSheet] = useState<t.CostExportSheet>('institutions');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await exportCostCsvFn({ data: { ...range, sheet } });
      const filename = filenameFromDisposition(
        response.headers.get('Content-Disposition'),
        datedFilename(`costs-${sheet}`, 'csv'),
      );
      downloadBlob(await response.blob(), filename);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : localize('com_costs_export_failed'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-(--cui-color-stroke-default) bg-(--syn-surface) p-3">
      <RangePicker value={preset} presets={COST_PRESETS} onChange={onPreset} />
      <span className="text-[13px] text-(--cui-color-text-muted) tabular-nums">
        {range.start} – {range.end}
      </span>
      <span className="flex-1" />
      <label className="flex items-center gap-2 text-[13px] font-semibold text-(--cui-color-text-muted)">
        {localize('com_costs_export_sheet')}
        <select
          value={sheet}
          onChange={(event) => setSheet(event.target.value as t.CostExportSheet)}
          className="admin-themed-control h-10 rounded-lg border border-(--cui-color-stroke-default) bg-(--syn-surface) px-2 text-sm text-(--cui-color-text-default)"
        >
          {SHEETS.map((item) => (
            <option key={item} value={item}>
              {localize(`com_costs_sheet_${item}`)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-(--cui-color-stroke-default) bg-transparent px-3.5 text-sm font-semibold text-(--cui-color-text-default) transition-colors hover:bg-(--cui-color-background-hover) disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Download aria-hidden="true" size={16} />
        {exporting ? localize('com_usage_exporting') : localize('com_costs_export')}
      </button>
    </div>
  );
}
