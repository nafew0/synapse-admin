import type { CSSProperties } from 'react';
import type * as t from '@/types';
import { cn } from '@/utils';

const WIDTH = 112;
const HEIGHT = 40;

export function Sparkline({ values, className, delay = 0 }: t.SparklineProps) {
  if (values.length < 2) {
    return null;
  }
  const max = Math.max(...values, 1);
  const points = values
    .map((value, i) => {
      const x = (i / (values.length - 1)) * (WIDTH - 2) + 1;
      const y = HEIGHT - 2 - (value / max) * (HEIGHT - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className={cn('h-10 w-28 shrink-0', className)}
    >
      <polyline
        points={points}
        pathLength={1}
        className="syn-line-draw"
        fill="none"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        style={{ stroke: 'var(--syn-chart-1)', '--syn-delay': `${delay}ms` } as CSSProperties}
      />
    </svg>
  );
}
