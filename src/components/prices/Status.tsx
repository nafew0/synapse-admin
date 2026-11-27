import { CircleAlert, CircleCheck, CircleHelp, CircleX, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';

const STYLE: Record<t.PriceRowStatus, { icon: LucideIcon; className: string }> = {
  ok: { icon: CircleCheck, className: 'bg-(--syn-success-bg) text-(--syn-success-fg)' },
  changed: { icon: TrendingUp, className: 'bg-(--syn-brand-tint) text-(--syn-brand-ink)' },
  not_listed: { icon: CircleAlert, className: 'bg-(--syn-warning-bg) text-(--syn-warning-fg)' },
  no_price: { icon: CircleX, className: 'bg-(--syn-danger-bg) text-(--syn-danger-fg)' },
};

/** Status is an icon and a word, never colour alone. */
export function PriceStatus({ status }: { status: t.PriceRowStatus }) {
  const localize = useLocalize();
  const { icon: StatusIcon, className } = STYLE[status] ?? {
    icon: CircleHelp,
    className: STYLE.ok.className,
  };
  return (
    <span
      data-status={status}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
        className,
      )}
    >
      <StatusIcon aria-hidden="true" size={13} strokeWidth={2.2} />
      {localize(`com_prices_status_${status}`)}
    </span>
  );
}
