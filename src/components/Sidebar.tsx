import { useState } from 'react';
import { Dropdown } from '@clickhouse/click-ui';
import { Link, useRouter } from '@tanstack/react-router';
import {
  Bot,
  Building2,
  ChartColumn,
  CircleHelp,
  KeyRound,
  LayoutDashboard,
  Moon,
  Network,
  PanelLeft,
  Settings2,
  ShieldCheck,
  Sun,
  Users,
} from 'lucide-react';
import type * as t from '@/types';
import {
  useStripAriaExpanded,
  useMemberSummary,
  useCapabilities,
  useLocalize,
} from '@/hooks';
import { useTheme } from '@/contexts/ThemeContext';
import synapseIcon from '@/assets/synapse-icon.svg';
import { SettingsDialog } from './SettingsDialog';
import { SystemCapabilities } from '@/constants';
import { getInitials, cn } from '@/utils';
import { adminLogoutFn } from '@/server';

/**
 * Institution admins only ever get the Groups half of Access (roles need
 * MANAGE_ROLES), so the item is named for what they can actually do there.
 */
function buildSections(canManageRoles: boolean, isPlatformSuperadmin: boolean): t.NavSection[] {
  return [
    {
      titleKey: 'com_nav_section_overview',
      items: [
        { labelKey: 'com_nav_dashboard', path: '/', icon: LayoutDashboard },
        {
          labelKey: 'com_nav_usage',
          path: '/usage',
          icon: ChartColumn,
          capability: SystemCapabilities.READ_USAGE,
        },
      ],
    },
    {
      titleKey: 'com_nav_section_people',
      items: [
        {
          labelKey: isPlatformSuperadmin ? 'com_nav_users' : 'com_nav_members',
          path: '/users',
          icon: Users,
          capability: SystemCapabilities.READ_USERS,
        },
        {
          labelKey: canManageRoles ? 'com_nav_access' : 'com_nav_groups',
          path: '/access',
          icon: canManageRoles ? ShieldCheck : Network,
          capability: [SystemCapabilities.READ_ROLES, SystemCapabilities.READ_GROUPS],
        },
      ],
    },
    {
      titleKey: 'com_nav_section_platform',
      items: [
        {
          labelKey: 'com_nav_institutions',
          path: '/institutions',
          icon: Building2,
          superadminOnly: true,
        },
        { labelKey: 'com_nav_agents', path: '/agents', icon: Bot, superadminOnly: true },
        {
          labelKey: 'com_nav_configuration',
          path: '/configuration',
          icon: Settings2,
          capability: SystemCapabilities.READ_CONFIGS,
        },
        {
          labelKey: 'com_nav_grants',
          path: '/grants',
          icon: KeyRound,
          capability: SystemCapabilities.READ_AUDIT_LOG,
        },
      ],
    },
    {
      titleKey: 'com_nav_section_support',
      items: [{ labelKey: 'com_nav_help', path: '/help', icon: CircleHelp }],
    },
  ];
}

function getUserInitials(user?: { name?: string; email?: string } | null): string {
  if (user?.name) return getInitials(user.name);
  if (user?.email) return user.email[0].toUpperCase();
  return '';
}

export function Sidebar({ user, collapsed, onToggle }: t.SidebarProps) {
  const localize = useLocalize();
  const router = useRouter();
  const { hasCapability } = useCapabilities();
  const { resolvedTheme, setTheme } = useTheme();
  const seatSummary = useMemberSummary();
  const currentPath = router.state.location.pathname;
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userMenuRef = useStripAriaExpanded<HTMLButtonElement>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isPlatformSuperadmin = user?.isPlatformSuperadmin === true;

  const isVisible = (item: t.NavItem) => {
    if (item.superadminOnly) return isPlatformSuperadmin;
    if (!item.capability) return true;
    if (Array.isArray(item.capability)) return item.capability.some((c) => hasCapability(c));
    return hasCapability(item.capability);
  };

  const sections = buildSections(
    hasCapability(SystemCapabilities.MANAGE_ROLES),
    isPlatformSuperadmin,
  )
    .map((section) => ({ ...section, items: section.items.filter(isVisible) }))
    .filter((section) => section.items.length > 0);

  const isActive = (path: string) =>
    path === '/' ? currentPath === '/' : currentPath.startsWith(path);

  const pendingInvites = seatSummary?.pendingInvites ?? 0;
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
  const themeLabel = localize(nextTheme === 'dark' ? 'com_nav_switch_dark' : 'com_nav_switch_light');
  const ThemeIcon = nextTheme === 'dark' ? Moon : Sun;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const result = await adminLogoutFn();
      if (!result.error && result.redirect) {
        window.location.href = result.redirect;
        return;
      }
      await router.invalidate();
      router.navigate({ to: '/login', search: { redirect: '/' } });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const initials = getUserInitials(user);
  const scopeLine = isPlatformSuperadmin
    ? localize('com_nav_platform_admin')
    : localize('com_nav_tenant', { tenant: user?.tenantId ?? '' });

  return (
    <>
      <aside
        aria-label={localize('com_a11y_admin_panel')}
        className={cn(
          'sticky top-0 z-(--z-floating) flex h-screen shrink-0 flex-col overflow-hidden border-r border-(--cui-color-stroke-default) bg-(--syn-surface) transition-[width] duration-200 motion-reduce:transition-none',
          collapsed ? 'w-16' : 'w-56',
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-2.5 px-3.5">
          <img src={synapseIcon} alt={localize('com_a11y_logo_alt')} className="h-9 w-9 shrink-0" />
          {!collapsed ? (
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[15px] font-bold text-(--cui-color-text-default)">
                {localize('com_auth_title')}
              </span>
              <span className="truncate text-xs text-(--cui-color-text-muted)">
                {localize(isPlatformSuperadmin ? 'com_nav_platform_admin' : 'com_nav_institution_admin')}
              </span>
            </div>
          ) : null}
        </div>

        <nav
          aria-label={localize('com_a11y_main_navigation')}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-2.5 py-3"
        >
          {sections.map((section) => (
            <div key={section.titleKey} className="flex flex-col gap-0.5">
              {collapsed ? (
                <div aria-hidden="true" className="mx-2 mb-1 border-t border-(--cui-color-stroke-muted)" />
              ) : (
                <span className="px-3 pb-1.5 text-[11px] font-semibold tracking-[0.08em] text-(--cui-color-text-muted) uppercase">
                  {localize(section.titleKey)}
                </span>
              )}
              {section.items.map((item) => {
                const label = localize(item.labelKey);
                const active = isActive(item.path);
                const badge = item.path === '/users' && pendingInvites > 0 ? pendingInvites : null;
                const NavIcon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={active ? 'page' : undefined}
                    aria-label={
                      collapsed || badge
                        ? [label, badge ? localize('com_nav_pending_badge', { count: badge }) : '']
                            .filter(Boolean)
                            .join(', ')
                        : undefined
                    }
                    title={collapsed ? label : undefined}
                    className={cn(
                      'relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm whitespace-nowrap no-underline transition-colors duration-100 motion-reduce:transition-none',
                      active
                        ? 'bg-(--syn-brand-tint) font-semibold text-(--syn-brand-ink)'
                        : 'font-medium text-(--cui-color-text-muted) hover:bg-(--cui-color-background-hover) hover:text-(--cui-color-text-default)',
                    )}
                  >
                    <NavIcon aria-hidden="true" size={18} strokeWidth={1.9} className="shrink-0" />
                    {!collapsed ? <span className="flex-1 truncate">{label}</span> : null}
                    {badge && !collapsed ? (
                      <span
                        aria-hidden="true"
                        className="rounded-full bg-(--syn-warning-bg) px-1.5 text-[11px] font-bold text-(--syn-warning-fg)"
                      >
                        {badge}
                      </span>
                    ) : null}
                    {badge && collapsed ? (
                      <span
                        aria-hidden="true"
                        className="absolute top-2 right-2 h-2 w-2 rounded-full bg-(--cui-color-accent)"
                      />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {initials && (
          <div
            className={cn(
              'flex shrink-0 items-center gap-2 border-t border-(--cui-color-stroke-default) px-2.5 py-3',
              collapsed && 'flex-col',
            )}
          >
            <Dropdown>
              <Dropdown.Trigger>
                <button
                  ref={userMenuRef}
                  type="button"
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-(--syn-brand-tint) text-xs font-bold text-(--syn-brand-ink) transition-colors hover:brightness-95"
                  aria-label={`${localize('com_nav_user_menu')}, ${user?.name || user?.email || ''}`}
                  aria-haspopup="true"
                  title={user?.name || user?.email || ''}
                >
                  <span aria-hidden="true">{initials}</span>
                </button>
              </Dropdown.Trigger>
              <Dropdown.Content>
                <div className="user-dropdown flex min-w-45 flex-col select-none">
                  {user && (
                    <div className="px-3 pt-3 pb-2">
                      <span className="block text-sm leading-tight font-medium text-(--cui-color-text-default)">
                        {user.name || ''}
                      </span>
                      {user.email && (
                        <span className="mt-0.5 block text-xs leading-tight text-(--cui-color-text-muted)">
                          {user.email}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="border-t border-(--cui-color-stroke-default)" />
                  <Dropdown.Item icon="settings" onClick={() => setSettingsOpen(true)}>
                    {localize('com_ui_settings')}
                  </Dropdown.Item>
                  <Dropdown.Item icon="slide-out" onClick={handleLogout} disabled={isLoggingOut}>
                    {isLoggingOut ? localize('com_ui_signing_out') : localize('com_ui_sign_out')}
                  </Dropdown.Item>
                </div>
              </Dropdown.Content>
            </Dropdown>
            {!collapsed && user ? (
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm leading-tight font-semibold text-(--cui-color-text-default)">
                  {user.name || user.email || ''}
                </span>
                <span className="block truncate text-xs leading-tight text-(--cui-color-text-muted)">
                  {scopeLine}
                </span>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setTheme(nextTheme)}
              aria-label={themeLabel}
              title={themeLabel}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-(--cui-color-stroke-default) bg-transparent text-(--cui-color-text-muted) transition-colors hover:bg-(--cui-color-background-hover) hover:text-(--cui-color-text-default)"
            >
              <ThemeIcon aria-hidden="true" size={17} strokeWidth={1.9} />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onToggle}
          aria-label={localize(collapsed ? 'com_nav_expand_sidebar' : 'com_nav_collapse_sidebar')}
          title={localize(collapsed ? 'com_nav_expand_sidebar' : 'com_nav_collapse_sidebar')}
          className="flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 border-0 border-t border-(--cui-color-stroke-default) bg-transparent py-2.5 text-xs text-(--cui-color-text-muted) transition-colors hover:bg-(--cui-color-background-hover) hover:text-(--cui-color-text-default)"
        >
          <PanelLeft aria-hidden="true" size={16} strokeWidth={1.9} />
          {!collapsed ? localize('com_nav_collapse_sidebar') : null}
        </button>
      </aside>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
