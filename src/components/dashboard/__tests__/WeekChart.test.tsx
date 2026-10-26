import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WeekChart } from '../WeekChart';

const days = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'];
const lastDays = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'];

describe('WeekChart', () => {
  it('lists the week Monday to Sunday, blanking days still to come', () => {
    render(
      <WeekChart
        today="2026-10-28"
        thisWeek={days.map((day, i) => ({ day, value: [120_000, 340_000, 50_000, 0, 0, 0, 0][i] }))}
        lastWeek={lastDays.map((day, i) => ({ day, value: [100_000, 200_000, 80_000, 90_000, 70_000, 5_000, 1_000][i] }))}
      />,
    );

    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(7);
    expect(rows[0]).toHaveTextContent('Monday');
    expect(rows[0]).toHaveTextContent('120K');
    expect(rows[6]).toHaveTextContent('Sunday');
    expect(within(rows[3]).getAllByRole('cell')[1]).toHaveTextContent('—');
    expect(within(rows[3]).getAllByRole('cell')[2]).toHaveTextContent('90K');
  });
});
