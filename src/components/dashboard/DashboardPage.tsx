import { useMemo } from 'react';
import { Link, getRouteApi } from '@tanstack/react-router';
import { Building2, ChartColumn, CircleHelp, KeyRound, Settings2, ShieldCheck } from 'lucide-react';
import type * as t from '@/types';
import { useCapabilities, useLocalize } from '@/hooks';
import { SystemCapabilities } from '@/constants';
import { Overview } from './Overview';

const Route = getRouteApi('/_app');

const QUICK_LINKS: Array<t.NavItem & { descKey: t.TranslationKeys }> = [
  {
    labelKey: 'com_nav_institutions',
    path: '/institutions',
    icon: Building2,
    descKey: 'com_dash_institutions_desc',
    superadminOnly: true,
  },
  {
    labelKey: 'com_nav_configuration',
    path: '/configuration',
    icon: Settings2,
    descKey: 'com_dash_config_desc',
    capability: SystemCapabilities.READ_CONFIGS,
  },
  {
    labelKey: 'com_nav_access',
    path: '/access',
    icon: ShieldCheck,
    descKey: 'com_dash_access_desc',
    capability: [SystemCapabilities.READ_ROLES, SystemCapabilities.READ_GROUPS],
  },
  {
    labelKey: 'com_nav_usage',
    path: '/usage',
    icon: ChartColumn,
    descKey: 'com_dash_usage_desc',
    capability: SystemCapabilities.READ_USAGE,
  },
  {
    labelKey: 'com_nav_grants',
    path: '/grants',
    icon: KeyRound,
    descKey: 'com_dash_grants_desc',
    capability: SystemCapabilities.READ_AUDIT_LOG,
  },
  {
    labelKey: 'com_nav_help',
    path: '/help',
    icon: CircleHelp,
    descKey: 'com_dash_help_desc',
  },
];

/**
 * Institution admins see their own tenant's usage and seats. Platform
 * superadmins have no tenant of their own, so they get the quick links.
 */
export function DashboardPage() {
  const { hasCapability } = useCapabilities();
  const { user } = Route.useRouteContext();
  const hasOwnTenant = Boolean(user?.tenantId) && user?.isPlatformSuperadmin !== true;

  if (hasOwnTenant && hasCapability(SystemCapabilities.READ_USAGE)) {
    return <Overview />;
  }
  return <QuickLinks isPlatformSuperadmin={user?.isPlatformSuperadmin === true} />;
}

function QuickLinks({ isPlatformSuperadmin }: { isPlatformSuperadmin: boolean }) {
  const localize = useLocalize();
  const { hasCapability } = useCapabilities();

  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  const visibleLinks = useMemo(
    () =>
      QUICK_LINKS.filter((link) => {
        if (link.superadminOnly) return isPlatformSuperadmin;
        if (!link.capability) return true;
        if (Array.isArray(link.capability)) return link.capability.some((c) => hasCapability(c));
        return hasCapability(link.capability);
      }),
    [hasCapability, isPlatformSuperadmin],
  );

  return (
    <div
      role="region"
      aria-label={localize('com_nav_dashboard')}
      className="flex flex-1 flex-col overflow-auto"
    >
      <div className="flex w-full flex-col gap-8 p-6">
        <section aria-label={localize('com_dash_quick_links')}>
          <h2 className="mb-3 text-sm font-medium text-(--cui-color-text-muted)">
            {localize('com_dash_quick_links')}
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {visibleLinks.map((link) => {
              const LinkIcon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="flex items-start gap-3 rounded-xl border border-(--cui-color-stroke-default) bg-(--syn-surface) p-4 no-underline transition-colors hover:bg-(--cui-color-background-hover)"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--syn-brand-tint) text-(--syn-brand-ink)"
                  >
                    <LinkIcon size={18} strokeWidth={1.9} />
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-(--cui-color-text-default)">
                      {localize(link.labelKey)}
                    </span>
                    <span className="text-xs text-(--cui-color-text-muted)">
                      {localize(link.descKey)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section
          aria-label={localize('com_dash_nav_tips')}
          className="rounded-xl border border-(--cui-color-stroke-default) bg-(--syn-surface) p-5"
        >
          <h2 className="mb-3 text-sm font-semibold text-(--cui-color-text-default)">
            {localize('com_dash_nav_tips')}
          </h2>
          <ul className="flex flex-col gap-3 text-sm text-(--cui-color-text-muted)">
            <li className="flex items-center gap-3">
              <kbd className="shrink-0 rounded border border-(--cui-color-stroke-default) bg-(--cui-color-background-secondary) px-1.5 py-0.5 text-xs font-medium text-(--cui-color-text-default)">
                {isMac ? '⌘B' : 'Ctrl+B'}
              </kbd>
              <span>{localize('com_dash_tip_sidebar')}</span>
            </li>
            <li className="flex items-center gap-3">
              <kbd className="shrink-0 rounded border border-(--cui-color-stroke-default) bg-(--cui-color-background-secondary) px-1.5 py-0.5 text-xs font-medium text-(--cui-color-text-default)">
                {isMac ? '⌘K' : 'Ctrl+K'}
              </kbd>
              <span>{localize('com_dash_tip_cmdk')}</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
