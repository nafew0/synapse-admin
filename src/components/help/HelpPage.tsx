import { Mail } from 'lucide-react';
import { useLocalize } from '@/hooks';

const SUPPORT_EMAIL = 'info@bdren.net.bd';

export function HelpPage() {
  const localize = useLocalize();

  return (
    <div
      role="region"
      aria-label={localize('com_nav_help')}
      className="flex flex-1 flex-col gap-6 overflow-auto p-6"
    >
      <section
        aria-labelledby="help-support-title"
        className="flex max-w-2xl flex-col gap-4 rounded-xl border border-(--cui-color-stroke-default) bg-(--syn-surface) p-6"
      >
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="syn-icon-pop flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-(--syn-brand-tint) text-(--syn-brand-ink)"
          >
            <Mail size={20} strokeWidth={1.9} />
          </span>
          <div className="flex flex-col gap-1">
            <h2 id="help-support-title" className="m-0 text-base font-semibold text-(--cui-color-text-default)">
              {localize('com_help_support_title')}
            </h2>
            <p className="m-0 text-sm text-(--cui-color-text-muted)">{localize('com_help_support_text')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 pl-15">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex h-10 items-center gap-2 rounded-lg bg-(--cui-color-accent) px-4 text-sm font-bold text-(--syn-on-accent) no-underline transition hover:brightness-95"
          >
            <Mail aria-hidden="true" size={16} />
            {SUPPORT_EMAIL}
          </a>
        </div>
      </section>
    </div>
  );
}
