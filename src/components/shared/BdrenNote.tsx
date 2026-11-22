import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { getBdrenAdminUrlFn } from '@/server';
import { useLocalize } from '@/hooks';

/** Points to the bdren.ai superadmin panel, where institutions and invitations are managed. */
export function BdrenNote() {
  const localize = useLocalize();
  const { data: url } = useQuery({
    queryKey: ['bdrenAdminUrl'],
    queryFn: () => getBdrenAdminUrlFn(),
    staleTime: Infinity,
  });

  return (
    <aside
      aria-label={localize('com_bdren_note_label')}
      className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-(--cui-color-stroke-default) bg-(--syn-surface) px-4 py-3 text-[13px] text-(--cui-color-text-muted)"
    >
      <span className="min-w-0 flex-1">{localize('com_bdren_note')}</span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 font-semibold text-(--cui-color-text-link)"
        >
          {localize('com_bdren_note_link')}
          <ExternalLink aria-hidden="true" size={14} />
        </a>
      ) : null}
    </aside>
  );
}
