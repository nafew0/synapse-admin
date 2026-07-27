import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type * as t from '@/types';
import { FormDialog } from '@/components/shared';
import { createMemberImportFn, dryRunMemberImportFn } from '@/server';
import { notifyError, notifySuccess } from '@/utils';

export function ImportMembersDialog({ open, onClose }: t.ImportMembersDialogProps) {
  const queryClient = useQueryClient();
  const [fileName, setFileName] = useState('');
  const [csvText, setCsvText] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{
    summary: t.InstitutionImportSummary;
    results: t.InstitutionImportRowResult[];
  } | null>(null);
  const [job, setJob] = useState<t.InstitutionImportJob | null>(null);

  const resetAndClose = () => {
    setFileName('');
    setCsvText('');
    setError('');
    setPreview(null);
    setJob(null);
    onClose();
  };

  const dryRunMutation = useMutation({
    mutationFn: () => dryRunMemberImportFn({ data: { csvText } }),
    onSuccess: (result) => {
      setPreview(result);
      setJob(null);
    },
    onError: (err: Error) => notifyError(err.message),
  });

  const importMutation = useMutation({
    mutationFn: () => createMemberImportFn({ data: { csvText } }),
    onSuccess: (result) => {
      setJob(result.job);
      queryClient.invalidateQueries({ queryKey: ['members'] });
      notifySuccess('Import completed');
    },
    onError: (err: Error) => notifyError(err.message),
  });

  const onSubmit = () => {
    setError('');
    if (!csvText.trim()) {
      setError('Choose a CSV file first');
      return;
    }

    if (!preview) {
      dryRunMutation.mutate();
      return;
    }

    importMutation.mutate();
  };

  const onFileChange = async (file: File | null) => {
    setError('');
    setPreview(null);
    setJob(null);
    if (!file) {
      setFileName('');
      setCsvText('');
      return;
    }

    setFileName(file.name);
    setCsvText(await file.text());
  };

  const summary = job?.summary ?? preview?.summary;
  const results = job?.results ?? preview?.results ?? [];

  return (
    <FormDialog
      open={open}
      title="Import members"
      submitLabel={preview ? 'Run import' : 'Preview import'}
      submitDisabled={!csvText.trim()}
      saving={dryRunMutation.isPending || importMutation.isPending}
      error={error}
      size="lg"
      onSubmit={onSubmit}
      onClose={resetAndClose}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="member-import-file" className="text-sm font-medium text-(--cui-color-text-default)">
          CSV file
        </label>
        <input
          id="member-import-file"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"
        />
        {fileName ? (
          <p className="text-xs text-(--cui-color-text-muted)">Loaded: {fileName}</p>
        ) : null}
      </div>

      <p className="text-xs text-(--cui-color-text-muted)">
        Expected columns: <code>email</code>, optional <code>name</code>, optional <code>role</code>.
      </p>

      {summary ? (
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-(--cui-color-stroke-default) p-3 text-sm md:grid-cols-4">
          <SummaryStat label="Rows" value={summary.totalRows} />
          <SummaryStat label="Invites" value={summary.invitesCreated} />
          <SummaryStat label="Updates" value={summary.membersUpdated} />
          <SummaryStat label="Errors" value={summary.errors} />
        </div>
      ) : null}

      {results.length > 0 ? (
        <div className="max-h-72 overflow-auto rounded-lg border border-(--cui-color-stroke-default)">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-(--cui-color-stroke-default) bg-(--cui-color-background-muted)">
                <th className="px-3 py-2">Row</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Message</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={`${row.rowNumber}-${row.email || 'empty'}`} className="border-b border-(--cui-color-stroke-default)">
                  <td className="px-3 py-2">{row.rowNumber}</td>
                  <td className="px-3 py-2">{row.email || '—'}</td>
                  <td className="px-3 py-2">{row.action}</td>
                  <td className="px-3 py-2">{row.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </FormDialog>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-(--cui-color-background-muted) p-3">
      <p className="text-xs text-(--cui-color-text-muted)">{label}</p>
      <p className="text-lg font-semibold text-(--cui-color-text-default)">{value}</p>
    </div>
  );
}
