import { describe, expect, it } from 'vitest';
import {
  addDays,
  dayCount,
  fillDaily,
  percentChange,
  presetRange,
  previousRange,
  rollingAverage,
  weekdayAverages,
  currentWeek,
  weekStart,
  sameDaysLastMonth,
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

  it('starts weeks on Monday, as allowances do', () => {
    expect(weekStart('2026-10-26')).toBe('2026-10-26');
    expect(weekStart('2026-10-25')).toBe('2026-10-19');
    expect(currentWeek('2026-10-28')).toEqual({ start: '2026-10-26', end: '2026-11-01' });
    expect(presetRange('week', '2026-10-28')).toEqual({ start: '2026-10-26', end: '2026-10-28' });
  });

  it('compares a month so far with the same days of the month before', () => {
    expect(sameDaysLastMonth({ start: '2026-10-01', end: '2026-10-26' })).toEqual({
      start: '2026-09-01',
      end: '2026-09-26',
    });
    expect(sameDaysLastMonth({ start: '2026-03-01', end: '2026-03-31' })).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
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

describe('weekdayAverages', () => {
  it('averages each weekday and skips the day still in progress', () => {
    const series = [
      { day: '2026-09-27', value: 10 },
      { day: '2026-09-28', value: 20 },
      { day: '2026-10-04', value: 30 },
      { day: '2026-10-05', value: 2 },
    ];
    const averages = weekdayAverages(series, ['2026-10-05']);
    expect(averages[0]).toEqual({ weekday: 0, average: 20, days: 2 });
    expect(averages[1]).toEqual({ weekday: 1, average: 20, days: 1 });
    expect(averages[2]).toEqual({ weekday: 2, average: 0, days: 0 });
  });
});
