import { useLocalize } from '@/hooks';

export function ManagedGroupBadge() {
  const localize = useLocalize();
  return (
    <span className="inline-block w-fit shrink-0 rounded-full bg-(--cui-color-background-secondary) px-2 py-0.5 text-[10px] font-medium text-(--cui-color-text-muted)">
      {localize('com_access_group_managed_badge')}
    </span>
  );
}
