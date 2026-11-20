import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type * as t from '@/types';
import { formatCompact, formatUsd, notifyError, notifySuccess } from '@/utils';
import { Card, DataTable, EmptyState, LoadingState } from '@/components/shared';
import {
  useLocalize,
  useReconciliation,
  useRefreshProviderFigures,
  useSaveUnstructuredEntry,
} from '@/hooks';

const inputClass =
  'admin-themed-control h-10 rounded-lg border border-(--cui-color-stroke-default) bg-(--syn-surface) px-2 text-sm text-(--cui-color-text-default)';

const STATUS_STYLE: Record<t.ReconcileStatus, string> = {
  ok: 'bg-(--syn-success-bg) text-(--syn-success-fg)',
  flagged: 'bg-(--syn-danger-bg) text-(--syn-danger-fg)',
  missing_ledger: 'bg-(--syn-danger-bg) text-(--syn-danger-fg)',
  missing_provider: 'bg-(--syn-warning-bg) text-(--syn-warning-fg)',
  empty: 'bg-(--cui-color-background-muted) text-(--cui-color-text-muted)',
};

function StatusBadge({ status, pct }: { status: t.ReconcileStatus; pct: number }) {
  const localize = useLocalize();
  return (
    <span
      data-status={status}
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}
    >
      {localize(`com_recon_status_${status}`, { pct })}
    </span>
  );
}

const formatPct = (value: number | null): string =>
  value === null ? '—' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;

function useAmount(unit: 'usd' | 'credits') {
  return (value: number | null): string => {
    if (value === null) return '—';
    return unit === 'usd' ? formatUsd(value) : formatCompact(value);
  };
}

interface RowProps {
  label: string;
  figure: t.ReconcileFigure;
  coverage?: string;
  amount: (value: number | null) => string;
  pct: number;
  strong?: boolean;
}

function FigureRow({ label, figure, coverage, amount, pct, strong }: RowProps) {
  return (
    <tr className={`border-t border-(--cui-color-stroke-muted) ${strong ? 'font-semibold' : ''}`}>
      <td className="py-2.5 pr-4">
        {label}
        {coverage ? (
          <span className="ml-2 text-xs font-normal text-(--cui-color-text-muted)">{coverage}</span>
        ) : null}
      </td>
      <td className="pr-4 text-right">{amount(figure.ledger)}</td>
      <td className="pr-4 text-right">{amount(figure.provider)}</td>
      <td className="pr-4 text-right">{amount(figure.gap)}</td>
      <td className="pr-4 text-right">{formatPct(figure.gapPct)}</td>
      <td className="text-right">
        <StatusBadge status={figure.status} pct={pct} />
      </td>
    </tr>
  );
}

function SourceNote({ service }: { service: t.ReconcileService }) {
  const localize = useLocalize();
  const { source } = service;
  const date = source.lastRunAt ? source.lastRunAt.slice(0, 16).replace('T', ' ') : '';
  return (
    <span className="text-xs text-(--cui-color-text-muted)">
      {localize(`com_recon_source_${source.status}`, { date })}
      {source.message && source.status !== 'ok' ? ` — ${source.message}` : ''}
    </span>
  );
}

function ServiceBlock({ service, pct }: { service: t.ReconcileService; pct: number }) {
  const localize = useLocalize();
  const [showDays, setShowDays] = useState(false);
  const amount = useAmount(service.unit);
  const head = [
    localize('com_recon_week'),
    localize('com_recon_ledger'),
    localize('com_recon_provider'),
    localize('com_recon_gap'),
    localize('com_recon_gap_pct'),
    localize('com_recon_status'),
  ];
  const coverage = (row: t.ReconcilePeriod) =>
    row.daysCovered < row.days
      ? localize('com_recon_days_covered', { covered: row.daysCovered, days: row.days })
      : undefined;
  const unit = service.unit === 'credits' ? ` (${localize('com_recon_credits')})` : '';
  return (
    <Card
      title={`${service.label}${unit}`}
      description={undefined}
      action={
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={service.total.status} pct={pct} />
          <SourceNote service={service} />
        </div>
      }
    >
      {service.weeks.length === 0 ? (
        <EmptyState message={localize('com_recon_none')} />
      ) : (
        <DataTable head={head} numericFrom={1} minWidth="min-w-180">
          <FigureRow
            strong
            label={localize('com_recon_range')}
            figure={service.total}
            coverage={coverage(service.total)}
            amount={amount}
            pct={pct}
          />
          {service.weeks.map((week) => (
            <FigureRow
              key={week.period}
              label={`${localize('com_recon_week')} ${week.period}`}
              figure={week}
              coverage={coverage(week)}
              amount={amount}
              pct={pct}
            />
          ))}
          {showDays
            ? service.days.map((day) => (
                <FigureRow key={day.day} label={day.day} figure={day} amount={amount} pct={pct} />
              ))
            : null}
        </DataTable>
      )}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-pressed={showDays}
          onClick={() => setShowDays((value) => !value)}
          className="h-8 cursor-pointer rounded-lg border border-(--cui-color-stroke-default) bg-transparent px-3 text-[13px] font-semibold text-(--cui-color-text-default)"
        >
          {localize(showDays ? 'com_recon_hide_days' : 'com_recon_show_days')}
        </button>
        {service.flagged > 0 ? (
          <span className="text-xs text-(--syn-danger-fg)">
            {localize('com_recon_flagged_days', { count: service.flagged })}
          </span>
        ) : null}
      </div>
    </Card>
  );
}

function UnstructuredCard({
  months,
  pct,
}: {
  months: t.ReconcileUnstructuredMonth[];
  pct: number;
}) {
  const localize = useLocalize();
  const [month, setMonth] = useState(months[months.length - 1]?.period ?? '');
  const [amount, setAmount] = useState('');
  const [pages, setPages] = useState('');
  const [note, setNote] = useState('');
  const save = useSaveUnstructuredEntry(() => {
    notifySuccess(localize('com_recon_invoice_saved'));
    setAmount('');
    setPages('');
    setNote('');
  });

  const submit = () => {
    const amountUsd = Number(amount);
    if (
      !/^\d{4}-\d{2}$/.test(month) ||
      amount.trim() === '' ||
      !Number.isFinite(amountUsd) ||
      amountUsd < 0
    ) {
      notifyError(localize('com_recon_invoice_invalid'));
      return;
    }
    save.mutate(
      {
        month,
        amountUsd,
        ...(pages.trim() ? { pages: Number(pages) } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      },
      { onError: (error: Error) => notifyError(error.message) },
    );
  };

  return (
    <Card
      title={localize('com_recon_unstructured_title')}
      description={localize('com_recon_unstructured_desc')}
    >
      {months.length === 0 ? (
        <EmptyState message={localize('com_recon_none')} />
      ) : (
        <DataTable
          numericFrom={1}
          minWidth="min-w-180"
          head={[
            localize('com_recon_month'),
            localize('com_recon_ledger'),
            localize('com_recon_provider'),
            localize('com_recon_gap'),
            localize('com_recon_gap_pct'),
            localize('com_recon_status'),
          ]}
        >
          {months.map((row) => (
            <FigureRow
              key={row.period}
              label={row.period}
              figure={row}
              amount={(value) => (value === null ? '—' : formatUsd(value))}
              pct={pct}
            />
          ))}
        </DataTable>
      )}
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-(--cui-color-text-muted)">
          {localize('com_recon_month')}
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className={`${inputClass} w-40`}
          />
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-(--cui-color-text-muted)">
          {localize('com_recon_invoice_usd')}
          <input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={`${inputClass} w-36`}
          />
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-(--cui-color-text-muted)">
          {localize('com_recon_invoice_pages')}
          <input
            type="number"
            min={0}
            step="1"
            value={pages}
            onChange={(event) => setPages(event.target.value)}
            className={`${inputClass} w-32`}
          />
        </label>
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-[13px] font-semibold text-(--cui-color-text-muted)">
          {localize('com_recon_invoice_note')}
          <input
            value={note}
            maxLength={200}
            onChange={(event) => setNote(event.target.value)}
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={save.isPending}
          className="h-10 cursor-pointer rounded-lg border-0 bg-(--syn-brand) px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {localize('com_recon_invoice_save')}
        </button>
      </form>
    </Card>
  );
}

/** Ledger against what each provider reports, for the period the Costs page is showing. */
export function Reconciliation({ range }: { range: t.DateRange }) {
  const localize = useLocalize();
  const query = useReconciliation(range);
  const refresh = useRefreshProviderFigures((result) => {
    const problem = result.results.find((item) =>
      ['rejected', 'unreadable', 'unreachable'].includes(item.status),
    );
    if (problem) notifyError(`${problem.service}: ${problem.message ?? problem.status}`);
    else notifySuccess(localize('com_recon_refreshed'));
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) {
    return <EmptyState message={query.error?.message || localize('com_recon_failed')} />;
  }
  const { data } = query;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 max-w-3xl text-[13px] text-(--cui-color-text-muted)">
          {localize('com_recon_desc', { pct: data.thresholdPct })}
        </p>
        <button
          type="button"
          disabled={refresh.isPending}
          onClick={() =>
            refresh.mutate(undefined, { onError: (error: Error) => notifyError(error.message) })
          }
          className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-(--cui-color-stroke-default) bg-transparent px-3.5 text-sm font-semibold text-(--cui-color-text-default) disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw aria-hidden="true" size={16} />
          {localize(refresh.isPending ? 'com_recon_refreshing' : 'com_recon_refresh')}
        </button>
      </div>
      {data.services.map((service) => (
        <ServiceBlock key={service.service} service={service} pct={data.thresholdPct} />
      ))}
      <UnstructuredCard months={data.unstructured} pct={data.thresholdPct} />
      <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-xs text-(--cui-color-text-muted)">
        {data.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </>
  );
}
