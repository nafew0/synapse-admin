import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, LoaderCircle, RefreshCw, RotateCcw, Trash2, Upload } from 'lucide-react';
import type * as t from '@/types';
import { deleteKbDocumentFn, retryKbDocumentFn, uploadKbDocumentFn } from '@/server';
import { kbQueryKey, isInProgress, useKbDocuments } from './useKbDocuments';
import { ConfirmDialog } from '@/components/access/ConfirmDialog';
import { MANAGE_KB_CAPABILITY } from '@/constants';
import { notifyError } from '@/utils/toast';
import { useCapabilities, useLocalize } from '@/hooks';
import { cn } from '@/utils';

const STATUS_STYLE: Record<t.KbDocumentStatus, string> = {
  queued: 'bg-(--cui-color-background-muted) text-(--cui-color-text-muted)',
  processing: 'bg-(--syn-warning-bg) text-(--syn-warning-fg)',
  ready: 'bg-(--syn-success-bg) text-(--syn-success-fg)',
  failed: 'bg-(--cui-color-background-danger) text-(--cui-color-text-danger)',
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 KB';
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

function StatusBadge({ document }: { document: t.KbDocument }) {
  const localize = useLocalize();
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        STATUS_STYLE[document.status],
      )}
    >
      {isInProgress(document) && (
        <LoaderCircle className="size-3 animate-spin motion-reduce:animate-none" aria-hidden />
      )}
      {localize(`com_kb_status_${document.status}`)}
    </span>
  );
}

function Details({ document }: { document: t.KbDocument }) {
  const localize = useLocalize();
  const lines: string[] = [];
  if (document.currentVersion > 0) {
    lines.push(
      localize('com_kb_details', { pages: document.pageCount, chunks: document.chunkCount }),
    );
  }
  if (isInProgress(document) && document.currentVersion > 0) {
    lines.push(
      localize('com_kb_live_version', {
        version: document.currentVersion,
        latest: document.latestVersion,
      }),
    );
  }
  if (document.unreadablePages.length > 0) {
    lines.push(localize('com_kb_unreadable', { pages: document.unreadablePages.join(', ') }));
  }
  return (
    <div className="space-y-0.5 text-xs text-(--cui-color-text-muted)">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      {document.error && (
        <p className={document.status === 'failed' ? 'text-(--cui-color-text-danger)' : ''}>
          {document.error}
        </p>
      )}
    </div>
  );
}

export function KnowledgeBase({ tenantId }: { tenantId?: string }) {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const { hasCapability } = useCapabilities();
  const canManage = hasCapability(MANAGE_KB_CAPABILITY);
  const query = useKbDocuments(tenantId);
  const fileInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('other');
  const [replacing, setReplacing] = useState<t.KbDocument | null>(null);
  const [deleting, setDeleting] = useState<t.KbDocument | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: kbQueryKey(tenantId) });

  const uploadMutation = useMutation({
    mutationFn: (input: { file: File; documentId?: string }) => {
      const form = new FormData();
      form.append('file', input.file);
      if (tenantId) form.append('tenantId', tenantId);
      if (input.documentId) {
        form.append('documentId', input.documentId);
      } else {
        form.append('docType', docType);
        if (title.trim()) form.append('title', title.trim());
      }
      return uploadKbDocumentFn({ data: form });
    },
    onSuccess: () => {
      setFile(null);
      setTitle('');
      setReplacing(null);
      if (fileInput.current) fileInput.current.value = '';
    },
    onError: (error: Error) => notifyError(error.message),
    onSettled: refresh,
  });

  const deleteMutation = useMutation({
    mutationFn: (document: t.KbDocument) =>
      deleteKbDocumentFn({ data: { documentId: document.id, tenantId } }),
    onSuccess: () => setDeleting(null),
    onError: (error: Error) => notifyError(error.message),
    onSettled: refresh,
  });

  const retryMutation = useMutation({
    mutationFn: (document: t.KbDocument) =>
      retryKbDocumentFn({ data: { documentId: document.id, tenantId } }),
    onError: (error: Error) => notifyError(error.message),
    onSettled: refresh,
  });

  const data = query.data;
  const documents = data?.documents ?? [];
  const building = documents.filter(isInProgress).length;
  const accept = data?.extensions.join(',');

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <p className="max-w-3xl text-sm text-(--cui-color-text-muted)">
          {localize('com_kb_intro')}
        </p>
        {data && (
          <p className="text-sm text-(--cui-color-text-default)">
            {localize('com_kb_usage', {
              documents: data.usage.documents,
              max: data.limits.maxDocuments,
              used: formatBytes(data.usage.bytes),
              total: formatBytes(data.limits.maxTotalBytes),
            })}
          </p>
        )}
      </section>

      {canManage && (
        <section
          aria-labelledby="kb-upload"
          className="flex flex-col gap-3 rounded-xl border border-(--cui-color-stroke-default) p-4"
        >
          <h2 id="kb-upload" className="text-base font-semibold text-(--cui-color-text-default)">
            {localize('com_kb_upload_title')}
          </h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-60 flex-1 flex-col gap-1 text-sm">
              <span className="text-(--cui-color-text-muted)">
                {localize('com_kb_choose_file')}
              </span>
              <input
                ref={fileInput}
                type="file"
                accept={accept}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="text-sm text-(--cui-color-text-default) file:mr-3 file:rounded-lg file:border-0 file:bg-(--cui-color-background-accent) file:px-3 file:py-2 file:text-sm"
              />
            </label>
            <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
              <span className="text-(--cui-color-text-muted)">
                {localize('com_kb_field_title')}
              </span>
              <input
                value={title}
                maxLength={300}
                onChange={(event) => setTitle(event.target.value)}
                className="rounded-lg border border-(--cui-color-stroke-default) bg-transparent px-3 py-2 text-(--cui-color-text-default)"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-(--cui-color-text-muted)">{localize('com_kb_field_type')}</span>
              <select
                value={docType}
                onChange={(event) => setDocType(event.target.value)}
                className="rounded-lg border border-(--cui-color-stroke-default) bg-transparent px-3 py-2 text-(--cui-color-text-default)"
              >
                {(data?.docTypes ?? ['other']).map((type) => (
                  <option key={type} value={type}>
                    {localize(`com_kb_type_${type}` as t.TranslationKeys)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={!file || uploadMutation.isPending}
              onClick={() => file && uploadMutation.mutate({ file })}
              className="inline-flex items-center gap-2 rounded-lg bg-(--cui-color-background-accent) px-4 py-2 text-sm font-semibold text-(--cui-color-text-default) disabled:opacity-50"
            >
              {uploadMutation.isPending ? (
                <LoaderCircle
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden
                />
              ) : (
                <Upload className="size-4" aria-hidden />
              )}
              {localize(uploadMutation.isPending ? 'com_kb_uploading' : 'com_kb_upload')}
            </button>
          </div>
          <p className="text-xs text-(--cui-color-text-muted)">{localize('com_kb_formats')}</p>
        </section>
      )}

      {building > 0 && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg bg-(--syn-warning-bg) px-4 py-3 text-sm text-(--syn-warning-fg)"
        >
          <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
          {localize('com_kb_building', { count: building })}
        </p>
      )}

      {query.isError && (
        <p role="alert" className="text-sm text-(--cui-color-text-danger)">
          {(query.error as Error).message}
        </p>
      )}

      {data && documents.length === 0 && (
        <p className="rounded-xl border border-dashed border-(--cui-color-stroke-default) p-8 text-center text-sm text-(--cui-color-text-muted)">
          {localize('com_kb_empty')}
        </p>
      )}

      {documents.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-(--cui-color-stroke-default)">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-(--cui-color-text-muted)">
              <tr className="border-b border-(--cui-color-stroke-default)">
                <th className="px-4 py-3 font-medium">{localize('com_kb_col_document')}</th>
                <th className="px-4 py-3 font-medium">{localize('com_kb_col_type')}</th>
                <th className="px-4 py-3 font-medium">{localize('com_kb_col_status')}</th>
                <th className="px-4 py-3 font-medium">{localize('com_kb_col_details')}</th>
                {canManage && (
                  <th className="px-4 py-3" aria-label={localize('com_kb_col_actions')} />
                )}
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr
                  key={document.id}
                  className="border-b border-(--cui-color-stroke-default) align-top last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <FileText
                        className="mt-0.5 size-4 shrink-0 text-(--cui-color-text-muted)"
                        aria-hidden
                      />
                      <div>
                        <p className="font-medium text-(--cui-color-text-default)">
                          {document.title}
                        </p>
                        <p className="text-xs text-(--cui-color-text-muted)">
                          {document.filename} · {formatBytes(document.sizeBytes)} · v
                          {document.latestVersion}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-(--cui-color-text-default)">
                    {localize(`com_kb_type_${document.docType}` as t.TranslationKeys)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge document={document} />
                  </td>
                  <td className="px-4 py-3">
                    <Details document={document} />
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {document.status === 'failed' && (
                          <button
                            type="button"
                            title={localize('com_kb_retry')}
                            aria-label={`${localize('com_kb_retry')}: ${document.title}`}
                            disabled={retryMutation.isPending}
                            onClick={() => retryMutation.mutate(document)}
                            className="rounded-lg p-2 text-(--cui-color-text-muted) hover:bg-(--cui-color-background-hover) disabled:opacity-40"
                          >
                            <RotateCcw className="size-4" aria-hidden />
                          </button>
                        )}
                        <button
                          type="button"
                          title={localize('com_kb_replace')}
                          aria-label={`${localize('com_kb_replace')}: ${document.title}`}
                          disabled={isInProgress(document) || uploadMutation.isPending}
                          onClick={() => {
                            setReplacing(document);
                            replaceInput.current?.click();
                          }}
                          className="rounded-lg p-2 text-(--cui-color-text-muted) hover:bg-(--cui-color-background-hover) disabled:opacity-40"
                        >
                          <RefreshCw className="size-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          title={localize('com_kb_delete')}
                          aria-label={`${localize('com_kb_delete')}: ${document.title}`}
                          onClick={() => setDeleting(document)}
                          className="rounded-lg p-2 text-(--cui-color-text-muted) hover:bg-(--cui-color-background-hover)"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <input
        ref={replaceInput}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const next = event.target.files?.[0];
          event.target.value = '';
          if (next && replacing) uploadMutation.mutate({ file: next, documentId: replacing.id });
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        title={localize('com_kb_delete')}
        description={localize('com_kb_delete_confirm', { title: deleting?.title ?? '' })}
        confirmLabel={localize('com_kb_delete')}
        saving={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
