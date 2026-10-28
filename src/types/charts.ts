import type { ReactNode } from 'react';

export interface DateRange {
  /** Inclusive first day, `YYYY-MM-DD`. */
  start: string;
  /** Inclusive last day, `YYYY-MM-DD`; the usage API treats `end` as inclusive. */
  end: string;
}

export type RangePreset = '7d' | '30d' | 'month' | 'lastMonth' | 'custom';

export interface TrendDatum {
  day: string;
  value: number;
}

export interface TrendTooltipRow {
  label: string;
  value: string;
}

export interface TrendChartProps {
  data: TrendDatum[];
  /** Accessible name and legend label of the plotted series. */
  label: string;
  averageLabel: string;
  formatValue: (value: number) => string;
  formatDay: (day: string) => string;
  /** Extra tooltip rows for the hovered day, after the series value. */
  detailRows?: (index: number) => TrendTooltipRow[];
  height?: number;
  averageWindow?: number;
}

export interface SparklineProps {
  values: number[];
  className?: string;
  /** Entrance delay in ms, to stagger with the tile it sits in. */
  delay?: number;
}

export interface MeterSegment {
  value: number;
  /** A CSS color, normally a `var(--syn-…)` token. */
  color: string;
  label: string;
}

export interface MeterProps {
  segments: MeterSegment[];
  max: number;
  ariaLabel: string;
  className?: string;
}

export interface ShareBarProps {
  value: number;
  max: number;
  className?: string;
  /** Grow the fill from empty on first render, starting after this many ms. */
  growDelay?: number;
}

export interface StatTileProps {
  label: string;
  value: string;
  icon?: ReactNode;
  detail?: ReactNode;
  children?: ReactNode;
  /** Position in a row of tiles; staggers the icon's entrance. */
  index?: number;
}

export interface DeltaProps {
  current: number;
  previous: number | undefined;
  /** Rendered after the percentage, e.g. "vs previous 30 days". */
  suffix: string;
}

export interface RangePickerProps {
  value: RangePreset;
  onChange: (preset: RangePreset) => void;
  presets?: RangePreset[];
}

export interface CardProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export interface LegendItem {
  label: string;
  color: string;
}

export interface WeekdayAverage {
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number;
  average: number;
  /** How many of this weekday fell in the range; 0 means no data, not no usage. */
  days: number;
}
