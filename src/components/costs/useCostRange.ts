import { useMemo, useState } from 'react';
import type * as t from '@/types';
import { presetRange } from '@/utils';

export const COST_PRESETS: t.RangePreset[] = ['7d', '30d', 'month', 'lastMonth'];

type CostPreset = Exclude<t.RangePreset, 'custom'>;

/** The preset the picker shows and the day range it stands for. */
export function useCostRange(initial: CostPreset = '30d') {
  const [preset, setPreset] = useState<CostPreset>(initial);
  const range = useMemo(() => presetRange(preset), [preset]);
  return { preset, setPreset, range };
}
