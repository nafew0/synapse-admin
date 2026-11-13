import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type * as t from '@/types';
import { notifyError, notifySuccess } from '@/utils/toast';
import { listKbDocumentsFn } from '@/server';
import { useLocalize } from '@/hooks';

const POLL_MS = 4_000;
const IN_PROGRESS: ReadonlySet<t.KbDocumentStatus> = new Set(['queued', 'processing']);

export const kbQueryKey = (tenantId?: string) => ['kbDocuments', tenantId ?? 'own'];

export const isInProgress = (document: t.KbDocument): boolean => IN_PROGRESS.has(document.status);

/** Last status seen per document version, shared by every observer so each notice shows once. */
const seen = new Map<string, t.KbDocumentStatus>();

/**
 * The institution's documents, polled while any is still being built. When a document that was
 * in progress becomes ready or fails, a notice shows on whichever admin page is open.
 */
export function useKbDocuments(tenantId?: string, enabled = true) {
  const localize = useLocalize();
  const query = useQuery({
    queryKey: kbQueryKey(tenantId),
    queryFn: () => listKbDocumentsFn({ data: { tenantId } }),
    enabled,
    refetchInterval: (current) =>
      current.state.data?.documents.some(isInProgress) ? POLL_MS : false,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    for (const document of query.data?.documents ?? []) {
      const key = `${document.id}:${document.latestVersion}`;
      const before = seen.get(key);
      seen.set(key, document.status);
      if (!before || !IN_PROGRESS.has(before) || IN_PROGRESS.has(document.status)) {
        continue;
      }
      /* A failed replacement leaves the document ready on its previous version. */
      const failed =
        document.status === 'failed' || document.currentVersion < document.latestVersion;
      if (failed) {
        notifyError(
          localize('com_kb_failed_toast', { title: document.title, error: document.error ?? '' }),
        );
      } else {
        notifySuccess(localize('com_kb_ready_toast', { title: document.title }));
      }
    }
  }, [query.data, localize]);

  return query;
}
