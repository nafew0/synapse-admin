import type * as t from '@/types';

/** Line-style legend for charts; identity never rests on color alone. */
export function ChartLegend({ items }: { items: t.LegendItem[] }) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs font-medium text-(--cui-color-text-muted)">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.75 w-3.5 rounded-full" style={{ background: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
