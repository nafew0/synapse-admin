/** The ledger stores cost in token credits, where 1,000,000 credits = $1 USD
 *  (see the Balance schema). Rendering the raw credit figure as "cost" reads as
 *  dollars and overstates spend a millionfold. */
const CREDITS_PER_USD = 1_000_000;

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
