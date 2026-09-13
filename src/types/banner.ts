import type { ReactNode } from 'react';

/**
 * Mirrors `TBanner` from `librechat-data-provider`; the published package this
 * panel depends on predates the banner fields. Only `app: 'admin'` banners
 * reach this panel.
 */
export type BannerCategory = 'feature' | 'update' | 'maintenance' | 'outage';

export type BannerDisplay = 'once' | 'until_dismissed' | 'always';

/** `popup` is the floating card, `banner` the slim top bar. */
export type BannerType = 'popup' | 'banner';

export interface Banner {
  bannerId: string;
  type: BannerType;
  title?: string;
  message: string;
  category: BannerCategory;
  display: BannerDisplay;
  linkLabel?: string;
  linkUrl?: string;
}

/** Where relative banner links resolve: the admin panel's own origin and base path. */
export interface LinkBase {
  origin: string;
  basePath: string;
}

export interface ResolvedLink {
  href: string;
  /** Opens in a new tab when it leaves the admin panel. */
  external: boolean;
}

export interface BannerViewProps {
  banner: Banner;
  category: BannerCategory;
  message: ReactNode;
  link: ResolvedLink | null;
  onDismiss: () => void;
}
