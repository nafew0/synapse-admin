import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WeekdayUsage } from '../WeekdayUsage';

/** 2026-09-28 is a Monday; one week of days with distinct totals. */
const series = [
  { day: '2026-09-28', value: 146_800 },
  { day: '2026-09-29', value: 92_700 },
  { day: '2026-09-30', value: 119_600 },
  { day: '2026-10-01', value: 88_300 },
  { day: '2026-10-02', value: 23_100 },
  { day: '2026-10-03', value: 26_300 },
  { day: '2026-10-04', value: 113_500 },
];

describe('WeekdayUsage', () => {
  it('labels every weekday bar with its tokens, not only the busiest', () => {
    render(<WeekdayUsage series={series} />);

    for (const label of ['146.8K', '92.7K', '119.6K', '88.3K', '23.1K', '26.3K', '113.5K']) {
      expect(screen.getAllByText(label)).toHaveLength(2);
    }
  });
});
