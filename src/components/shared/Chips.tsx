import { CircleCheck, CirclePause, CircleX, Mail } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type * as t from '@/types';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';

const STATUS_STYLE: Record<t.MemberStatus, { icon: LucideIcon; className: string; key: t.TranslationKeys }> = {
  active: {
    icon: CircleCheck,
    className: 'bg-(--syn-success-bg) text-(--syn-success-fg)',
    key: 'com_status_active',
  },
  invited: {
    icon: Mail,
    className: 'bg-(--syn-warning-bg) text-(--syn-warning-fg)',
    key: 'com_status_invited',
  },
  expired: {
    icon: CircleX,
    className: 'bg-(--syn-danger-bg) text-(--syn-danger-fg)',
    key: 'com_status_expired',
  },
  suspended: {
    icon: CirclePause,
    className: 'bg-(--syn-neutral-bg) text-(--syn-neutral-fg)',
    key: 'com_status_suspended',
  },
  removed: {
    icon: CircleX,
    className: 'bg-(--syn-neutral-bg) text-(--syn-neutral-fg)',
    key: 'com_status_removed',
  },
};

/** Status is always an icon plus a word, never color alone. */
export function StatusChip({ status }: { status: t.MemberStatus }) {
  const localize = useLocalize();
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.removed;
  const StatusIcon = style.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
        style.className,
      )}
    >
      <StatusIcon aria-hidden="true" size={13} strokeWidth={2.2} />
      {localize(style.key)}
    </span>
  );
}

export function RoleChip({ role }: { role?: string }) {
  const localize = useLocalize();
  const isAdmin = role === 'INSTITUTION_ADMIN' || role === 'ADMIN';
  return (
    <span
      className={cn(
        'rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
        isAdmin
          ? 'bg-(--syn-brand-tint) text-(--syn-brand-ink)'
          : 'bg-(--syn-neutral-bg) text-(--syn-neutral-fg)',
      )}
    >
      {localize(isAdmin ? 'com_role_admin' : 'com_role_member')}
    </span>
  );
}

export function InitialsAvatar({ label, invite, size = 'md' }: { label: string; invite?: boolean; size?: 'md' | 'lg' }) {
  const initials = invite
    ? '@'
    : label
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join('');
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-bold',
        size === 'lg' ? 'h-13 w-13 text-lg' : 'h-8.5 w-8.5 text-xs',
        invite
          ? 'border-[1.5px] border-dashed border-(--cui-color-stroke-intense) text-(--cui-color-text-muted)'
          : 'bg-(--syn-brand-tint) text-(--syn-brand-ink)',
      )}
    >
      {initials}
    </span>
  );
}
