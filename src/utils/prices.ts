import type * as t from '@/types';

const FIELD_KEYS: Record<string, string> = {
  prompt: 'com_prices_field_prompt',
  completion: 'com_prices_field_completion',
  cacheRead: 'com_prices_field_cacheRead',
  cacheWrite: 'com_prices_field_cacheWrite',
  cacheWrite1h: 'com_prices_field_cacheWrite1h',
  reasoning: 'com_prices_field_reasoning',
  image: 'com_prices_field_image',
  imageOutput: 'com_prices_field_imageOutput',
  audio: 'com_prices_field_audio',
  audioOutput: 'com_prices_field_audioOutput',
  webSearch: 'com_prices_field_webSearch',
  contextLength: 'com_prices_field_contextLength',
};

const OTHER_FIELDS = [
  'reasoning',
  'image',
  'imageOutput',
  'audio',
  'audioOutput',
  'webSearch',
] as const;

/** Up to four decimals so $0.0825 stays exact, two at least so $3 reads $3.00. */
export function formatRate(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

export const formatRateOrDash = (value: number | null | undefined): string =>
  value == null ? '—' : formatRate(value);

/** `4.125` against `3.75` → `+$0.375`; the sign is in the text, not only the colour. */
export function formatSignedRate(change: number): string {
  const text = formatRate(Math.abs(change));
  if (change === 0) return text;
  return `${change > 0 ? '+' : '−'}${text}`;
}

export function formatSignedPct(pct: number): string {
  if (pct === 0) return '0.0%';
  return `${pct > 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}%`;
}

export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

export interface DiffLabel {
  key: string;
  /** Tier threshold in tokens when the line belongs to a long-prompt tier. */
  tier?: number;
}

/** Label key for a diff field; tier fields carry their threshold. */
export function diffLabel(field: string): DiffLabel {
  const [head, min, name] = field.split(':');
  if (head !== 'tier') return { key: FIELD_KEYS[field] ?? field };
  return { key: FIELD_KEYS[name] ?? name, tier: Number(min) };
}

/** A diff value as text: tokens for the context window, dollars for everything else. */
export function formatDiffValue(field: string, value: number | null): string {
  if (value == null) return '—';
  return field === 'contextLength' ? value.toLocaleString('en-US') : formatRate(value);
}

/** The biggest percentage move in a diff, signed; null when nothing has a base to compare to. */
export function biggestPct(lines: t.PriceDiffLine[]): number | null {
  return lines.reduce<number | null>((best, line) => {
    if (line.changePct == null) return best;
    return best == null || Math.abs(line.changePct) > Math.abs(best) ? line.changePct : best;
  }, null);
}

/** Price fields beyond input, output and cache that a model actually has, in display order. */
export function otherPrices(price: t.PriceBlock | null): { field: string; value: number }[] {
  if (!price) return [];
  return OTHER_FIELDS.flatMap((field) => {
    const value = price[field];
    return value == null ? [] : [{ field, value }];
  });
}

/** Where a model is used: a label key for the prefix and the rest of the id. */
export function usedForLabel(use: string): { key: string; rest: string } {
  const [head, ...rest] = use.split(':');
  return { key: `com_prices_use_${head}`, rest: rest.join(':') };
}

export const USE_FILTERS = ['endpoint:', 'spec:', 'title', 'agent', 'ledger'] as const;

export const tierLabel = (tokens: number): string =>
  tokens >= 1000 ? `${Math.round(tokens / 1000)}K` : String(tokens);
