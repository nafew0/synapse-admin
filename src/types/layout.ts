import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { IconName } from './scope';
import type { TranslationKeys } from './hooks';

export interface SidebarProps {
  user?: {
    name?: string;
    email?: string;
    tenantId?: string | null;
    isPlatformSuperadmin?: boolean;
  } | null;
  collapsed: boolean;
  onToggle: () => void;
}

export interface NavItem {
  labelKey: TranslationKeys;
  path: string;
  icon: LucideIcon;
  /** Shown when the admin holds any one of these capabilities. */
  capability?: string | string[];
  superadminOnly?: boolean;
}

export interface NavSection {
  titleKey: TranslationKeys;
  items: NavItem[];
}

export interface HeaderProps {
  title?: string;
  onSearchClick?: () => void;
  children?: ReactNode;
}

export interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface CommandItemProps {
  icon?: IconName;
  label: string;
  keywords?: string[];
  onSelect: () => void;
}

export interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}
