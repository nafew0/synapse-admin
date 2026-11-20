import type * as t from '@/types';
import { biggestPct, formatDateTime, formatSignedPct, notifyError } from '@/utils';
import { useLocalize, useMarkNoticeSeen } from '@/hooks';

const TONE: Record<t.PriceChangeKind, string> = {
  price_changed: 'border-(--cui-color-stroke-default)',
  unpriced: 'border-(--syn-danger-border) bg-(--syn-danger-bg)',
  not_listed: 'border-(--cui-color-stroke-default) bg-(--syn-warning-bg)',
  sync_failing: 'border-(--syn-danger-border) bg-(--syn-danger-bg)',
};

interface NoticeProps {
  notice: t.PriceNotice;
  onView: (modelId: string) => void;
}

function Notice({ notice, onView }: NoticeProps) {
  const localize = useLocalize();
  const seen = useMarkNoticeSeen();
  const pct = biggestPct(notice.diff);
  const viewable = notice.modelId !== '*';
  return (
    <li
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-4 py-3 ${TONE[notice.kind]}`}
    >
      <p className="m-0 min-w-0 flex-1 basis-64 text-[13px] text-(--cui-color-text-default)">
        {notice.summary}
        <span className="ml-2 text-xs text-(--cui-color-text-muted)">
          {pct == null ? '' : `${formatSignedPct(pct)} · `}
          {localize('com_prices_notice_from', { date: formatDateTime(notice.createdAt) })}
        </span>
      </p>
      <div className="flex items-center gap-2">
        {viewable ? (
          <button
            type="button"
            onClick={() => onView(notice.modelId)}
            className="h-8 cursor-pointer rounded-lg border border-(--cui-color-stroke-default) bg-transparent px-3 text-[13px] font-semibold text-(--cui-color-text-default)"
          >
            {localize('com_prices_view')}
          </button>
        ) : null}
        <button
          type="button"
          disabled={seen.isPending}
          onClick={() =>
            seen.mutate(notice._id, { onError: (error: Error) => notifyError(error.message) })
          }
          className="h-8 cursor-pointer rounded-lg border border-(--cui-color-stroke-default) bg-transparent px-3 text-[13px] font-semibold text-(--cui-color-text-default) disabled:cursor-not-allowed disabled:opacity-50"
        >
          {localize('com_prices_mark_seen')}
        </button>
      </div>
    </li>
  );
}

/** Unseen notices from the sync, newest first; each is cleared by hand. */
export function PriceNotices({
  notices,
  onView,
}: {
  notices: t.PriceNotice[];
  onView: (modelId: string) => void;
}) {
  const localize = useLocalize();
  if (notices.length === 0) return null;
  return (
    <section aria-label={localize('com_prices_notices')} className="flex flex-col gap-2">
      <h2 className="m-0 text-[15px] font-semibold text-(--cui-color-text-default)">
        {localize('com_prices_notices')}
      </h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {notices.map((notice) => (
          <Notice key={notice._id} notice={notice} onView={onView} />
        ))}
      </ul>
    </section>
  );
}
