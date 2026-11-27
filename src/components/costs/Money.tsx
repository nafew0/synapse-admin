import { formatBdt, formatUsd } from '@/utils';

/** Taka first, dollars beside it; both come from the same ledger figure. */
export function Money({ usd, bdt, className }: { usd: number; bdt: number; className?: string }) {
  return (
    <span className={className}>
      <span className="font-semibold">{formatBdt(bdt)}</span>
      <span className="ml-1.5 text-(--cui-color-text-muted)">{formatUsd(usd)}</span>
    </span>
  );
}
