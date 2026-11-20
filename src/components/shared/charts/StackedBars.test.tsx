import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StackedBars } from './StackedBars';

const props = {
  days: ['2026-11-01', '2026-11-02'],
  series: [
    { key: 'a', label: 'Models', color: 'red', values: [3, 0] },
    { key: 'b', label: 'OCR', color: 'blue', values: [1, 2] },
  ],
  label: 'Daily cost',
  formatValue: (value: number) => `$${value}`,
  formatDay: (day: string) => day.slice(5),
};

describe('StackedBars', () => {
  it('draws one bar per day and a table for screen readers', () => {
    render(<StackedBars {...props} />);
    expect(screen.getAllByTestId('stacked-bar')).toHaveLength(2);
    expect(screen.getByRole('table', { hidden: true })).toBeInTheDocument();
  });

  it('lists each series and the day total on hover', () => {
    render(<StackedBars {...props} />);
    fireEvent.pointerEnter(screen.getAllByTestId('stacked-bar')[0]);
    const tooltip = screen.getByRole('status');
    expect(tooltip).toHaveTextContent('Models');
    expect(tooltip).toHaveTextContent('$3');
    expect(tooltip).toHaveTextContent('$4');
  });

  it('renders nothing without days', () => {
    const { container } = render(<StackedBars {...props} days={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
