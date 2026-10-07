import { describe, expect, it } from 'vitest';
import {
  addDays,
  dayCount,
  fillDaily,
  percentChange,
  presetRange,
  previousRange,
  rollingAverage,
} from './trend';

describe('date ranges', () => {
  it('adds days across month boundaries', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('counts both ends of a range', () => {
    expect(dayCount({ start: '2026-09-08', end: '2026-10-07' })).toBe(30);
  });

  it('builds the equally long range just before', () => {
    expect(previousRange({ start: '2026-09-08', end: '2026-10-07' })).toEqual({
      start: '2026-08-09',
      end: '2026-09-07',
    });
  });

  it('resolves presets from a given day', () => {
    expect(presetRange('7d', '2026-10-07')).toEqual({ start: '2026-10-01', end: '2026-10-07' });
    expect(presetRange('30d', '2026-10-07')).toEqual({ start: '2026-09-08', end: '2026-10-07' });
    expect(presetRange('month', '2026-10-07')).toEqual({ start: '2026-10-01', end: '2026-10-07' });
    expect(presetRange('lastMonth', '2026-10-07')).toEqual({
      start: '2026-09-01',
      end: '2026-09-30',
    });
    expect(presetRange('lastMonth', '2026-01-15')).toEqual({
      start: '2025-12-01',
      end: '2025-12-31',
    });
  });
});

describe('series helpers', () => {
  it('fills days with no usage as zero', () => {
    const filled = fillDaily(
      [
        { day: '2026-10-01', total: 5 },
        { day: '2026-10-03', total: 7 },
      ],
      { start: '2026-10-01', end: '2026-10-04' },
      (point) => point.total,
    );
    expect(filled).toEqual([
      { day: '2026-10-01', value: 5 },
      { day: '2026-10-02', value: 0 },
      { day: '2026-10-03', value: 7 },
      { day: '2026-10-04', value: 0 },
    ]);
  });

  it('averages a trailing window once it is full', () => {
    expect(rollingAverage([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });

  it('reports change only when there is an earlier figure', () => {
    expect(percentChange(112, 100)).toBe(12);
    expect(percentChange(90, 100)).toBe(-10);
    expect(percentChange(5, 0)).toBeNull();
    expect(percentChange(5, undefined)).toBeNull();
  });
});
