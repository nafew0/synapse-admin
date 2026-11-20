import { useMemo, useState } from 'react';
import type * as t from '@/types';
import { presetRange } from '@/utils';

/** The cost API windows are Asia/Dhaka days, whatever timezone the browser is in. */
const dhakaToday = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());

export const COST_PRESETS: t.RangePreset[] = ['7d', '30d', 'month', 'lastMonth'];

export type CostPreset = Exclude<t.RangePreset, 'custom'>;

export interface CostRangeControl {
  preset: CostPreset;
  setPreset: (preset: CostPreset) => void;
  range: t.DateRange;
}

/** The preset the picker shows and the day range it stands for. */
export function useCostRange(initial: CostPreset = '30d'): CostRangeControl {
  const [preset, setPreset] = useState<CostPreset>(initial);
  const range = useMemo(() => presetRange(preset, dhakaToday()), [preset]);
  return { preset, setPreset, range };
}
