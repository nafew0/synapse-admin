import type * as t from '@/types';

/** Services in the ledger, in the order the breakdown lists them. */
export const COST_SERVICES = [
  'openrouter',
  'unstructured',
  'firecrawl',
  'stt',
  'embeddings',
] as const;

/** How each service counts its work: the label key for one unit and its size in raw units. */
const SERVICE_UNITS: Record<string, { labelKey: string; perUnit: number }> = {
  openrouter: { labelKey: 'com_costs_unit_tokens', perUnit: 1 },
  embeddings: { labelKey: 'com_costs_unit_tokens', perUnit: 1 },
  unstructured: { labelKey: 'com_costs_unit_pages', perUnit: 1 },
  firecrawl: { labelKey: 'com_costs_unit_credits', perUnit: 1 },
  stt: { labelKey: 'com_costs_unit_minutes', perUnit: 60 },
};

/** Semantic chart roles, one per service; the legend names them so colour is never the only cue. */
const SERVICE_COLORS: Record<string, string> = {
  openrouter: 'var(--syn-chart-1)',
  unstructured: 'var(--syn-chart-2)',
  firecrawl: 'var(--syn-info-fg)',
  stt: 'var(--syn-warning-fg)',
  embeddings: 'var(--syn-success-fg)',
};
const FALLBACK_COLORS = ['var(--syn-brand)', 'var(--syn-danger-fg)', 'var(--syn-ghost)'];

export const serviceLabelKey = (service: string): string => `com_costs_service_${service}`;

export function serviceColor(service: string, index = 0): string {
  return SERVICE_COLORS[service] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

export function serviceUnit(service: string): { labelKey: string; perUnit: number } {
  return SERVICE_UNITS[service] ?? { labelKey: 'com_costs_unit_units', perUnit: 1 };
}

/** Units of a service in the unit people read, e.g. seconds of voice as minutes. */
export function serviceAmount(service: string, units: number): number {
  return units / serviceUnit(service).perUnit;
}

export function formatBdt(value: number): string {
  return `৳${new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(Math.round(value))}`;
}

/** Share as a whole percent, e.g. `0.1234` → `12%`. */
export const formatShare = (fraction: number): string => `${Math.round(fraction * 100)}%`;

/** `-0.256` → `25.6`; the arrow beside it carries the sign. */
export const percentOf = (fraction: number): number => Math.round(Math.abs(fraction) * 1000) / 10;

/** The `count` costliest ledger rows; the API pages by recency, so this ranks what was loaded. */
export function topRequests(rows: t.CostRequestRow[], count = 10): t.CostRequestRow[] {
  return [...rows].sort((a, b) => b.ledgerUsd - a.ledgerUsd).slice(0, count);
}

/** Services with spend first by cost, so the stack and legend follow the same order. */
export function sortedServices(byService: t.CostByService): string[] {
  return Object.entries(byService)
    .sort((a, b) => b[1] - a[1])
    .map(([service]) => service);
}
