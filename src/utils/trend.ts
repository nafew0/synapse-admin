import type * as t from '@/types';

const DAY_MS = 86_400_000;

const compactFormatter = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function parseDay(day: string): number {
  const [year, month, date] = day.split('-').map(Number);
  return Date.UTC(year, month - 1, date);
}

function toDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Calendar day in the viewer's own timezone, as `YYYY-MM-DD`. */
export function localDay(date: Date = new Date()): string {
  return toDay(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

export function addDays(day: string, amount: number): string {
  return toDay(parseDay(day) + amount * DAY_MS);
}

export function dayCount(range: t.DateRange): number {
  return Math.round((parseDay(range.end) - parseDay(range.start)) / DAY_MS) + 1;
}

/** The equally long range ending the day before `range` starts. */
export function previousRange(range: t.DateRange): t.DateRange {
  const end = addDays(range.start, -1);
  return { start: addDays(end, 1 - dayCount(range)), end };
}

export function presetRange(preset: Exclude<t.RangePreset, 'custom'>, today = localDay()): t.DateRange {
  const [year, month] = today.split('-').map(Number);
  if (preset === '7d') {
    return { start: addDays(today, -6), end: today };
  }
  if (preset === '30d') {
    return { start: addDays(today, -29), end: today };
  }
  if (preset === 'month') {
    return { start: toDay(Date.UTC(year, month - 1, 1)), end: today };
  }
  return {
    start: toDay(Date.UTC(year, month - 2, 1)),
    end: toDay(Date.UTC(year, month - 1, 0)),
  };
}

/**
 * The timeseries endpoint returns only days that had usage; a chart needs every
 * day of the range, with quiet days at zero, or gaps read as continuous trends.
 */
export function fillDaily<T extends { day: string }>(
  points: T[],
  range: t.DateRange,
  pick: (point: T) => number,
): t.TrendDatum[] {
  const byDay = new Map(points.map((point) => [point.day, pick(point)]));
  const total = dayCount(range);
  const filled: t.TrendDatum[] = [];
  for (let i = 0; i < total; i++) {
    const day = addDays(range.start, i);
    filled.push({ day, value: byDay.get(day) ?? 0 });
  }
  return filled;
}

/** Trailing average; `null` until a full window of days is available. */
export function rollingAverage(values: number[], window: number): Array<number | null> {
  const averages: Array<number | null> = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= window) {
      sum -= values[i - window];
    }
    averages.push(i >= window - 1 ? sum / window : null);
  }
  return averages;
}

/** Whole-percent change, or `null` when there is no earlier figure to compare with. */
export function percentChange(current: number, previous: number | undefined): number | null {
  if (previous == null || previous === 0) {
    return null;
  }
  return Math.round(((current - previous) / previous) * 100);
}

export function formatCompact(value: number): string {
  return compactFormatter.format(value);
}

export function formatDayLabel(day: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' }).format(new Date(parseDay(day)));
}

/** "2 hours ago", "yesterday", or a date for anything older than a week. */
export function formatRelativeTime(value: string | null | undefined, now = Date.now()): string {
  if (!value) {
    return '';
  }
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) {
    return '';
  }
  const seconds = Math.round((then - now) / 1000);
  const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const abs = Math.abs(seconds);
  if (abs < 3600) {
    return relative.format(Math.round(seconds / 60), 'minute');
  }
  if (abs < DAY_MS / 1000) {
    return relative.format(Math.round(seconds / 3600), 'hour');
  }
  if (abs < (7 * DAY_MS) / 1000) {
    return relative.format(Math.round(seconds / (DAY_MS / 1000)), 'day');
  }
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(then);
}
