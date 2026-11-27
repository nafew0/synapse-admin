import { describe, expect, it } from 'vitest';
import type * as t from '@/types';
import {
  formatBdt,
  formatShare,
  percentOf,
  serviceAmount,
  sortedServices,
  topRequests,
} from './costs';

const row = (id: string, ledgerUsd: number): t.CostRequestRow => ({
  id,
  createdAt: '2026-11-01T00:00:00Z',
  user: 'u',
  tenantId: 't',
  conversationId: null,
  messageId: null,
  service: 'openrouter',
  model: null,
  usageKind: null,
  taskType: null,
  billable: true,
  tokenType: null,
  units: 1,
  pages: 0,
  ledgerUsd,
});

describe('cost helpers', () => {
  it('shows taka as whole numbers with a thousands separator', () => {
    expect(formatBdt(12345.6)).toBe('৳12,346');
    expect(formatBdt(0)).toBe('৳0');
  });

  it('turns seconds of voice into minutes and leaves other units alone', () => {
    expect(serviceAmount('stt', 600)).toBe(10);
    expect(serviceAmount('unstructured', 14)).toBe(14);
  });

  it('formats shares and changes as whole or one-decimal percents', () => {
    expect(formatShare(0.1234)).toBe('12%');
    expect(percentOf(-0.2561)).toBe(25.6);
  });

  it('ranks services and requests by cost, highest first', () => {
    expect(sortedServices({ firecrawl: 1, openrouter: 9, stt: 3 })).toEqual([
      'openrouter',
      'stt',
      'firecrawl',
    ]);
    const rows = [row('a', 1), row('b', 5), row('c', 3)];
    expect(topRequests(rows, 2).map((r) => r.id)).toEqual(['b', 'c']);
    expect(rows.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });
});
