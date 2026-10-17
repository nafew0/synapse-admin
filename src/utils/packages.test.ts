import { describe, expect, it } from 'vitest';
import {
  effectiveRate,
  formatTaka,
  formatUsd,
  parseAmount,
  previewPackage,
  toPackageKey,
} from './packages';

const pricing = { bdtPerUsd: 123, providerFeePercent: 0, defaultWeeklyPercent: 35 };

describe('previewPackage', () => {
  it('matches the server conversion for a 300 tk package', () => {
    const preview = previewPackage({ monthlyCredit: 300, weeklyPercent: null }, pricing);
    expect(preview.monthlyCredits).toBe(2_439_024);
    expect(preview.weeklyPercent).toBe(35);
    expect(preview.weeklyUsd).toBeCloseTo((300 / 123) * 0.35, 6);
  });

  it('uses the package weekly percentage when set', () => {
    expect(previewPackage({ monthlyCredit: 300, weeklyPercent: 50 }, pricing).weeklyPercent).toBe(
      50,
    );
  });

  it('adds the provider fee to the rate', () => {
    expect(effectiveRate({ ...pricing, providerFeePercent: 5.5 })).toBeCloseTo(129.765, 3);
  });
});

describe('formatting', () => {
  it('formats taka and dollars', () => {
    expect(formatTaka(2500)).toBe('৳2,500');
    expect(formatUsd(2.4390243)).toBe('$2.44');
  });

  it('derives a key from a package name', () => {
    expect(toPackageKey('  Business Plus (2026) ')).toBe('business-plus-2026');
  });

  it('treats empty and invalid input as no value', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('12.5')).toBe(12.5);
  });
});
