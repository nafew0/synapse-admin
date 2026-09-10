import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type * as t from '@/types';
import { getBannerFn, markBannerSeenFn, dismissBannerFn } from '@/server';
import { renderInlineMarkup, toSafeHref } from '@/utils';
import { getApiBaseUrl } from '@/server/utils/url';
import { CATEGORY_LABEL_KEYS } from './labels';
import { Card } from './Card';
import { Bar } from './Bar';

const bannerQueryKey = (userId: string) => ['banner', userId];

/**
 * The announcement configured with `npm run update-banner`, rendered as the
 * same floating card or top bar as the chat app. Seen/dismissed state is
 * shared with the chat app per user.
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

  const chatBaseUrl = getApiBaseUrl();
  const message = useMemo(
    () => (banner ? renderInlineMarkup(banner.message, chatBaseUrl) : null),
    [banner, chatBaseUrl],
  );

  if (!banner) return null;

  const props: t.BannerViewProps = {
    banner,
    message,
    category: CATEGORY_LABEL_KEYS[banner.category] ? banner.category : 'update',
    linkHref: toSafeHref(banner.linkUrl ?? null, chatBaseUrl),
    onDismiss: () => dismiss(banner.bannerId),
  };
  return banner.type === 'popup' ? <Card {...props} /> : <Bar {...props} />;
}
