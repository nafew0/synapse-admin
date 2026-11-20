import type * as t from '@/types';
import {
  cn,
  formatBdt,
  formatDateTime,
  formatRate,
  formatRateOrDash,
  otherPrices,
  usedForLabel,
} from '@/utils';
import { useLocalize } from '@/hooks';
import { PriceStatus } from './Status';

const COLUMNS: t.TranslationKeys[] = [
  'com_prices_col_model',
  'com_prices_col_used',
  'com_prices_col_io',
  'com_prices_col_cache',
  'com_prices_col_other',
  'com_prices_col_long',
  'com_prices_col_context',
  'com_prices_col_source',
  'com_prices_col_status',
  'com_prices_col_changed',
];

const cell =
  'px-2 py-2.5 align-top max-md:flex max-md:justify-between max-md:gap-4 max-md:py-1.5 max-md:before:shrink-0 max-md:before:text-xs max-md:before:text-(--cui-color-text-muted) max-md:before:content-[attr(data-label)]';

function Rate({ value, bdtPerUsd }: { value?: number | null; bdtPerUsd: number | null }) {
  const localize = useLocalize();
  if (value == null) return <>—</>;
  const title =
    bdtPerUsd == null
      ? undefined
      : localize('com_prices_bdt_hover', { amount: formatBdt(value * bdtPerUsd) });
  return <span title={title}>{formatRate(value)}</span>;
}

function Pair({
  a,
  b,
  bdtPerUsd,
}: {
  a?: number | null;
  b?: number | null;
  bdtPerUsd: number | null;
}) {
  return (
    <span className="whitespace-nowrap">
      <Rate value={a} bdtPerUsd={bdtPerUsd} /> / <Rate value={b} bdtPerUsd={bdtPerUsd} />
    </span>
  );
}

function ModelRow({
  row,
  bdtPerUsd,
  onOpen,
}: {
  row: t.ModelPriceRow;
  bdtPerUsd: number | null;
  onOpen: (modelId: string) => void;
}) {
  const localize = useLocalize();
  const labels = COLUMNS.map((key) => localize(key));
  const { price } = row;
  const others = otherPrices(price);
  const manual = row.source === 'manual';
  return (
    <tr
      onClick={() => onOpen(row.modelId)}
      className="cursor-pointer border-t border-(--cui-color-stroke-muted) hover:bg-(--cui-color-background-hover) max-md:mb-3 max-md:block max-md:rounded-lg max-md:border max-md:border-(--cui-color-stroke-default) max-md:px-3 max-md:py-2"
    >
      <td data-label={labels[0]} className={cn(cell, 'max-md:block max-md:before:hidden')}>
        <button
          type="button"
          aria-label={localize('com_prices_open_model', { name: row.name })}
          onClick={(event) => {
            event.stopPropagation();
            onOpen(row.modelId);
          }}
          className="flex cursor-pointer flex-col items-start gap-0.5 border-0 bg-transparent p-0 text-left"
        >
          <span className="text-[13px] font-semibold text-(--cui-color-text-default)">
            {row.name}
          </span>
          <span className="font-mono text-[11px] break-all text-(--cui-color-text-muted)">
            {row.modelId}
          </span>
        </button>
      </td>
      <td data-label={labels[1]} className={cell}>
        <span className="flex flex-wrap gap-1 max-md:justify-end">
          {row.usedFor.map((use) => {
            const { key, rest } = usedForLabel(use);
            return (
              <span
                key={use}
                className="rounded-md bg-(--syn-neutral-bg) px-1.5 py-0.5 text-[11px] text-(--syn-neutral-fg)"
              >
                {localize(key)}
                {rest ? `: ${rest}` : ''}
              </span>
            );
          })}
        </span>
      </td>
      <td data-label={labels[2]} className={cell}>
        {price ? <Pair a={price.prompt} b={price.completion} bdtPerUsd={bdtPerUsd} /> : '—'}
      </td>
      <td data-label={labels[3]} className={cell}>
        {price ? <Pair a={price.cacheRead} b={price.cacheWrite} bdtPerUsd={bdtPerUsd} /> : '—'}
      </td>
      <td data-label={labels[4]} className={cell}>
        {others.length === 0 ? (
          '—'
        ) : (
          <span className="flex flex-col max-md:items-end">
            {others.map(({ field, value }) => (
              <span key={field} className="whitespace-nowrap">
                {localize(`com_prices_field_${field}`)} {formatRateOrDash(value)}
              </span>
            ))}
          </span>
        )}
      </td>
      <td data-label={labels[5]} className={cell}>
        {row.longPrompt ?? '—'}
      </td>
      <td data-label={labels[6]} className={cell}>
        {row.contextLength ? row.contextLength.toLocaleString('en-US') : '—'}
      </td>
      <td data-label={labels[7]} className={cell}>
        {row.source == null
          ? '—'
          : localize(manual ? 'com_prices_source_manual' : 'com_prices_source_openrouter')}
        {manual && row.override?.setBy ? (
          <span className="block text-[11px] text-(--cui-color-text-muted)">
            {localize('com_prices_set_by', { name: row.override.setBy })}
          </span>
        ) : null}
      </td>
      <td data-label={labels[8]} className={cell}>
        <PriceStatus status={row.status} />
      </td>
      <td data-label={labels[9]} className={cell}>
        {row.lastChangedAt && row.version > 1 ? formatDateTime(row.lastChangedAt) : '—'}
      </td>
    </tr>
  );
}

/** One row per model in use; below the tablet width each row becomes a labelled card. */
export function ModelTable({
  models,
  bdtPerUsd,
  onOpen,
}: {
  models: t.ModelPriceRow[];
  bdtPerUsd: number | null;
  onOpen: (modelId: string) => void;
}) {
  const localize = useLocalize();
  return (
    <div className="overflow-x-auto rounded-xl border border-(--cui-color-stroke-default) bg-(--syn-surface) p-3 max-md:border-0 max-md:bg-transparent max-md:p-0">
      <table className="w-full min-w-260 border-collapse text-left text-[13px] tabular-nums max-md:block max-md:min-w-0">
        <thead className="max-md:sr-only">
          <tr className="text-xs text-(--cui-color-text-muted)">
            {COLUMNS.map((key) => (
              <th key={key} scope="col" className="px-2 py-2 font-medium">
                {localize(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="max-md:block">
          {models.map((row) => (
            <ModelRow key={row.modelId} row={row} bdtPerUsd={bdtPerUsd} onOpen={onOpen} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
