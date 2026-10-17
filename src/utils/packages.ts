import type * as t from '@/types';

/** One credit is one millionth of a US dollar, the unit the quota engine enforces. */
export const CREDITS_PER_USD = 1_000_000;

export type PackagePreview = {
  weeklyPercent: number;
  monthlyUsd: number;
  weeklyUsd: number;
  monthlyCredits: number;
};

/** Taka that buy one dollar of usage once the provider fee is added. */
export function effectiveRate(pricing: t.UsagePricingInput): number {
  return pricing.bdtPerUsd * (1 + pricing.providerFeePercent / 100);
}

/** Mirrors the server's pricing so the editor can preview a package before it is saved. */
export function previewPackage(
  input: Pick<t.UsagePackageInput, 'monthlyCredit' | 'weeklyPercent'>,
  pricing: t.UsagePricingInput,
): PackagePreview {
  const weeklyPercent = input.weeklyPercent ?? pricing.defaultWeeklyPercent;
  const monthlyUsd = input.monthlyCredit / effectiveRate(pricing);
  return {
    weeklyPercent,
    monthlyUsd,
    weeklyUsd: (monthlyUsd * weeklyPercent) / 100,
    monthlyCredits: Math.floor(monthlyUsd * CREDITS_PER_USD),
  };
}

export function formatTaka(value: number): string {
  return `৳${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

export function formatUsd(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** A package key from its name: lowercase, hyphenated, at most 40 characters. */
export function toPackageKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/** Parses a number field, returning `null` for an empty or invalid entry. */
export function parseAmount(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
