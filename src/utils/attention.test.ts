import { describe, expect, it } from 'vitest';
import type * as t from '@/types';
import { institutionAttention } from './attention';

const base: t.InstitutionAttentionInput = {
  status: 'active',
  adminCount: 1,
  joined: 25,
  validInvites: 2,
  maxSeats: 40,
  expiredInvites: 0,
  lastActiveDay: '2026-10-25',
  today: '2026-10-26',
};

const keys = (input: Partial<t.InstitutionAttentionInput>) =>
  institutionAttention({ ...base, ...input }).map((item) => item.key);

describe('institutionAttention', () => {
  it('raises nothing for a healthy institution', () => {
    expect(keys({})).toEqual([]);
  });

  it('flags suspension, a missing admin, expired invites and idleness in that order', () => {
    expect(
      keys({ status: 'suspended', adminCount: 0, expiredInvites: 4, lastActiveDay: '2026-10-01' }),
    ).toEqual(['suspended', 'no_admin', 'expired', 'idle']);
  });

  it('counts valid invitations toward the 90% seat warning', () => {
    expect(keys({ joined: 34, validInvites: 1 })).toEqual([]);
    expect(institutionAttention({ ...base, joined: 34, validInvites: 2 })).toEqual([
      { key: 'seats', used: 36, max: 40 },
    ]);
  });

  it('never warns about seats when the institution has no seat limit', () => {
    expect(keys({ maxSeats: null, joined: 5000 })).toEqual([]);
  });

  it('treats no usage at all in range as idle, but only once members joined', () => {
    expect(keys({ lastActiveDay: null })).toEqual(['idle']);
    expect(keys({ lastActiveDay: null, joined: 0 })).toEqual([]);
  });

  it('stays quiet about data that has not loaded yet', () => {
    expect(keys({ adminCount: null, expiredInvites: null, lastActiveDay: undefined })).toEqual([]);
  });
});
