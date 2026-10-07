import type * as t from '@/types';
import { cn } from '@/utils';

export function Card({ title, description, action, children, className }: t.CardProps) {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col gap-4 rounded-xl border border-(--cui-color-stroke-default) bg-(--syn-surface) p-5',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="m-0 text-[15px] font-semibold text-(--cui-color-text-default)">{title}</h2>
          {description ? (
            <p className="m-0 text-[13px] text-(--cui-color-text-muted)">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
