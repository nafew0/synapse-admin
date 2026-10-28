import { useLocalize } from '@/hooks';

export function ManagedGroupBadge() {
  const localize = useLocalize();
  return (
    <span className="inline-block w-fit shrink-0 rounded-full bg-(--syn-info-bg) px-2 py-0.5 text-[11px] font-semibold text-(--syn-info-fg)">
      {localize('com_access_group_managed_badge')}
    </span>
  );
}
