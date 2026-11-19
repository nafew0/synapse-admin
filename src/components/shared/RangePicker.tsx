import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';

const PRESET_LABELS: Record<t.RangePreset, string> = {
  week: 'com_range_week',
  '7d': 'com_range_7d',
  '30d': 'com_range_30d',
  month: 'com_range_month',
  lastMonth: 'com_range_last_month',
  custom: 'com_range_custom',
};

const DEFAULT_PRESETS: t.RangePreset[] = ['7d', '30d', 'month'];

export function RangePicker({ value, onChange, presets = DEFAULT_PRESETS }: t.RangePickerProps) {
  const localize = useLocalize();
  return (
    <div
      role="group"
      aria-label={localize('com_range_label')}
      className="flex rounded-lg bg-(--cui-color-background-muted) p-0.5"
    >
      {presets.map((preset) => {
        const selected = preset === value;
        return (
          <button
            key={preset}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(preset)}
            className={cn(
              'h-8 cursor-pointer rounded-md border-0 px-3 text-[13px] whitespace-nowrap transition-colors',
              selected
                ? 'bg-(--syn-surface) font-semibold text-(--syn-brand-ink) shadow-sm'
                : 'bg-transparent font-medium text-(--cui-color-text-muted) hover:text-(--cui-color-text-default)',
            )}
          >
            {localize(PRESET_LABELS[preset])}
          </button>
        );
      })}
    </div>
  );
}
