import { Icon } from '@clickhouse/click-ui';
import type * as t from '@/types';
import { CATEGORY_LABEL_KEYS } from './labels';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';

/** Slim bar above the header, matching the chat app's top bar. */
export function Bar({ banner, category, message, linkHref, onDismiss }: t.BannerViewProps) {
  const localize = useLocalize();
  const canDismiss = banner.display !== 'always';

  return (
    <div
      role="region"
      aria-label={localize('com_banner_label')}
      className={cn(
        'synapse-banner flex min-h-11 shrink-0 items-center gap-3 py-2 pl-4 text-sm text-(--cui-color-text-default)',
        canDismiss ? 'pr-2' : 'pr-4',
        `synapse-banner-${category}`,
      )}
    >
      <span
        className={cn(
          'shrink-0 rounded-full px-2 py-0.5 text-[11px] leading-4 font-semibold tracking-wide uppercase',
          `synapse-banner-chip-${category}`,
        )}
      >
        {localize(CATEGORY_LABEL_KEYS[category])}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {banner.title && <strong className="font-semibold">{banner.title}</strong>}
        <span className="text-(--cui-color-text-muted) [&_a]:underline">{message}</span>
        {linkHref && (
          <a
            href={linkHref}
            target="_blank"
            rel="noopener noreferrer"
            className="synapse-banner-link font-medium whitespace-nowrap underline underline-offset-4"
          >
            {`${banner.linkLabel || localize('com_banner_learn_more')} →`}
          </a>
        )}
      </div>
      {canDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={localize('com_banner_dismiss')}
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-(--cui-color-text-muted) transition-colors hover:bg-(--cui-color-background-hover) hover:text-(--cui-color-text-default)"
        >
          <span aria-hidden="true" className="flex">
            <Icon name="cross" size="sm" />
          </span>
        </button>
      )}
    </div>
  );
}
