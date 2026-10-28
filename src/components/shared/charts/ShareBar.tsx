import type { CSSProperties } from 'react';
import type * as t from '@/types';
import { cn } from '@/utils';

/** Gap between consecutive bars when a list of them grows in. */
export const BAR_STAGGER_MS = 120;

/** A single-value bar for comparing a row against the largest row in a table. */
export function ShareBar({ value, max, className, growDelay }: t.ShareBarProps) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;
  return (
    <div aria-hidden="true" className={cn('h-1.5 w-full rounded-full bg-(--syn-track)', className)}>
      <div
        className={cn('h-full rounded-full bg-(--syn-chart-1)', growDelay != null && 'syn-bar-grow')}
        style={{ width: `${width}%`, '--syn-delay': `${growDelay ?? 0}ms` } as CSSProperties}
      />
    </div>
  );
}
