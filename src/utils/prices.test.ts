import { describe, expect, it } from 'vitest';
import type * as t from '@/types';
import {
  biggestPct,
  diffLabel,
  formatDiffValue,
  formatRate,
  formatSignedPct,
  formatSignedRate,
  otherPrices,
  tierLabel,
  usedForLabel,
} from './prices';

const line = (overrides: Partial<t.PriceDiffLine>): t.PriceDiffLine => ({
  field: 'prompt',
  previous: 1,
  current: 1,
  change: 0,
  changePct: 0,
  kind: 'unchanged',
  ...overrides,
});

describe('price formatting', () => {
  it('keeps small rates exact and whole rates to cents', () => {
    expect(formatRate(0.0825)).toBe('$0.0825');
    expect(formatRate(4.125)).toBe('$4.125');
    expect(formatRate(3)).toBe('$3.00');
  });

  it('puts the sign in the text', () => {
    expect(formatSignedRate(0.375)).toBe('+$0.375');
    expect(formatSignedRate(-0.5)).toBe('−$0.50');
    expect(formatSignedPct(10)).toBe('+10.0%');
    expect(formatSignedPct(-2.5)).toBe('−2.5%');
  });

  it('formats the context window as tokens and the rest as dollars', () => {
    expect(formatDiffValue('contextLength', 1_000_000)).toBe('1,000,000');
    expect(formatDiffValue('completion', 3.75)).toBe('$3.75');
    expect(formatDiffValue('cacheRead', null)).toBe('—');
  });
});

describe('diff helpers', () => {
  it('labels tier fields with their threshold', () => {
    expect(diffLabel('tier:100000:completion')).toEqual({
      key: 'com_prices_field_completion',
      tier: 100000,
    });
    expect(diffLabel('prompt')).toEqual({ key: 'com_prices_field_prompt' });
    expect(tierLabel(100000)).toBe('100K');
  });

  it('finds the biggest move by size, keeping its sign', () => {
    expect(
      biggestPct([line({ changePct: 4 }), line({ changePct: -12 }), line({ changePct: null })]),
    ).toBe(-12);
    expect(biggestPct([line({ changePct: null })])).toBeNull();
  });

  it('lists only the extra prices a model has', () => {
    const price: t.PriceBlock = {
      prompt: 1,
      completion: 2,
      imageOutput: 40,
      webSearch: 0.01,
      tiers: [],
    };
    expect(otherPrices(price)).toEqual([
      { field: 'imageOutput', value: 40 },
      { field: 'webSearch', value: 0.01 },
    ]);
    expect(otherPrices(null)).toEqual([]);
  });

  it('splits a use into its kind and detail', () => {
    expect(usedForLabel('spec:office-assistant')).toEqual({
      key: 'com_prices_use_spec',
      rest: 'office-assistant',
    });
    expect(usedForLabel('title')).toEqual({ key: 'com_prices_use_title', rest: '' });
  });
});
