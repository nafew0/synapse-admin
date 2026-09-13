import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type * as t from '@/types';
import { getBannerFn, markBannerSeenFn, dismissBannerFn } from '@/server';
import { renderInlineMarkup, resolveLink } from '@/utils';
import { normalizeBasePath } from '@/config/basePath';
import { CATEGORY_LABEL_KEYS } from './labels';
import { Card } from './Card';
import { Bar } from './Bar';

const bannerQueryKey = (userId: string) => ['banner', userId];

/** `null` during server rendering; the banner only renders in the browser. */
function adminLinkBase(): t.LinkBase | null {
  if (typeof window === 'undefined') return null;
  return {
    origin: window.location.origin,
    basePath: normalizeBasePath(import.meta.env.VITE_BASE_PATH),
  };
}

/**
 * The admin-panel announcement configured with `npm run update-banner --
 * --app admin`. It is separate from the chat app's banner and is rendered as
 * a floating card or a top bar.
 */
export function Banner({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const recordedId = useRef<string | null>(null);

  const { data: banner } = useQuery({
    queryKey: bannerQueryKey(userId),
    queryFn: () => getBannerFn(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const { mutate: markSeen } = useMutation({
    mutationFn: (bannerId: string) => markBannerSeenFn({ data: { bannerId } }),
  });

  const { mutate: dismiss } = useMutation({
    mutationFn: (bannerId: string) => dismissBannerFn({ data: { bannerId } }),
    onMutate: () => queryClient.setQueryData(bannerQueryKey(userId), null),
  });

  useEffect(() => {
    if (!banner || banner.display !== 'once' || recordedId.current === banner.bannerId) return;
    recordedId.current = banner.bannerId;
    markSeen(banner.bannerId);
  }, [banner, markSeen]);

  const linkBase = useMemo(adminLinkBase, []);
  const message = useMemo(
    () => (banner && linkBase ? renderInlineMarkup(banner.message, linkBase) : null),
    [banner, linkBase],
  );

  if (!banner || !linkBase) return null;

  const props: t.BannerViewProps = {
    banner,
    message,
    category: CATEGORY_LABEL_KEYS[banner.category] ? banner.category : 'update',
    link: resolveLink(banner.linkUrl ?? null, linkBase),
    onDismiss: () => dismiss(banner.bannerId),
  };
  return banner.type === 'popup' ? <Card {...props} /> : <Bar {...props} />;
}
