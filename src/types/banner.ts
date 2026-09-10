import type { ReactNode } from 'react';

/**
 * Mirrors `TBanner` from `librechat-data-provider`; the published package this
 * panel depends on predates the category/display fields.
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

export interface BannerViewProps {
  banner: Banner;
  category: BannerCategory;
  message: ReactNode;
  linkHref: string | null;
  onDismiss: () => void;
}
