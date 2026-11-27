import type { ReactNode } from 'react';
import { cn } from '@/utils';

export function DataTable({
  head,
  numericFrom,
  minWidth,
  children,
}: {
  head: string[];
  /** Columns at or after this index are right-aligned numbers. */
  numericFrom: number;
  minWidth: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full border-collapse text-left text-[13px] tabular-nums', minWidth)}>
        <thead>
          <tr className="text-xs text-(--cui-color-text-muted)">
            {head.map((label, index) => (
              <th
                key={label}
                scope="col"
                className={cn(
                  'py-2 pr-4 font-medium last:pr-0',
                  index >= numericFrom && 'text-right',
                )}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
