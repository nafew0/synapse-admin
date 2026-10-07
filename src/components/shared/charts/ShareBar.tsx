import type * as t from '@/types';
import { cn } from '@/utils';

/** A single-value bar for comparing a row against the largest row in a table. */
export function ShareBar({ value, max, className }: t.ShareBarProps) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;
  return (
    <div aria-hidden="true" className={cn('h-1.5 w-full rounded-full bg-(--syn-track)', className)}>
      <div className="h-full rounded-full bg-(--syn-chart-1)" style={{ width: `${width}%` }} />
    </div>
  );
}
