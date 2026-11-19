import type * as t from '@/types';
import { addDays } from './trend';

const SEATS_WARNING_SHARE = 0.9;
export const IDLE_DAYS = 14;

/**
 * What a superadmin should look at on an institution, most urgent first. Each rule
 * fires only on data that has loaded, so a slow request never raises a false alarm.
 */
export function institutionAttention(input: t.InstitutionAttentionInput): t.InstitutionAttention[] {
  const items: t.InstitutionAttention[] = [];
  const { status, adminCount, joined, validInvites, maxSeats, expiredInvites, lastActiveDay, today } = input;
  if (status === 'suspended') {
    items.push({ key: 'suspended' });
  }
  if (adminCount === 0) {
    items.push({ key: 'no_admin' });
  }
  if (maxSeats != null && maxSeats > 0 && (joined + validInvites) / maxSeats >= SEATS_WARNING_SHARE) {
    items.push({ key: 'seats', used: joined + validInvites, max: maxSeats });
  }
  if (expiredInvites != null && expiredInvites > 0) {
    items.push({ key: 'expired', count: expiredInvites });
  }
  if (lastActiveDay !== undefined && joined > 0 && (!lastActiveDay || lastActiveDay < addDays(today, -IDLE_DAYS))) {
    items.push({ key: 'idle' });
  }
  return items;
}
