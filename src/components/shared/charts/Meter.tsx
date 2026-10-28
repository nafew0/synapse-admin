import type * as t from '@/types';
import { cn } from '@/utils';

/** Stacked horizontal meter; segments are separated by a 2px surface gap. */
export function Meter({ segments, max, ariaLabel, className }: t.MeterProps) {
  const visible = segments.filter((segment) => segment.value > 0);
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn('flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-(--syn-track)', className)}
    >
      {visible.map((segment) => (
        <div
          key={segment.label}
          className="h-full first:rounded-l-full last:rounded-r-full"
          style={{
            width: `${Math.min((segment.value / Math.max(max, 1)) * 100, 100)}%`,
            background: segment.color,
          }}
        />
      ))}
    </div>
  );
}

export function MeterLegend({ segments }: { segments: t.MeterSegment[] }) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-xs text-(--cui-color-text-muted)">
      {segments.map((segment) => (
        <li key={segment.label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2 w-2 rounded-xs" style={{ background: segment.color }} />
          {segment.label}
        </li>
      ))}
    </ul>
  );
}
