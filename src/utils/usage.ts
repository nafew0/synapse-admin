/** The ledger stores cost in token credits, where 1,000,000 credits = $1 USD
 *  (see the Balance schema). Rendering the raw credit figure as "cost" reads as
 *  dollars and overstates spend a millionfold. */
const CREDITS_PER_USD = 1_000_000;

/**
 * Rows are merged server-side by the label members see, so several rows can
 * share one underlying model id (two specs, or two providers, on one model).
 * React keys must combine all three or rows get reused under the wrong name.
 */
export function modelRowKey(row: {
  displayName?: string;
  providerKey?: string;
  modelKey: string;
}): string {
  return [row.displayName ?? '', row.providerKey ?? '', row.modelKey].join('|');
}

export function formatUsageNumber(value: number): string {
  return new Intl.NumberFormat().format(Math.round(value));
}

export function formatUsageCost(credits: number): string {
  const usd = credits / CREDITS_PER_USD;
  if (usd === 0) {
    return '$0.00';
  }
  if (Math.abs(usd) < 0.01) {
    return `$${usd.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')}`;
  }
  return `$${usd.toFixed(2)}`;
}

export function formatUsageCredits(credits: number): string {
  return `${new Intl.NumberFormat().format(Math.round(credits))} credits`;
}
