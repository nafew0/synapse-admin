import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { IconButton } from '@clickhouse/click-ui';
import type * as t from '@/types';
import {
  cn,
  formatDateTime,
  formatRate,
  formatRateOrDash,
  formatUsd,
  notifyError,
  notifySuccess,
  otherPrices,
  tierLabel,
} from '@/utils';
import { EmptyState, LoadingState } from '@/components/shared';
import { useClearOverride, useLocalize, useModelPrice, usePriceDiff } from '@/hooks';
import { OverrideDialog } from './Override';
import { PriceStatus } from './Status';
import { DiffTable } from './Diff';

const buttonClass =
  'h-9 cursor-pointer rounded-lg border border-(--cui-color-stroke-default) bg-transparent px-3 text-[13px] font-semibold text-(--cui-color-text-default) disabled:cursor-not-allowed disabled:opacity-50';
const selectClass =
  'admin-themed-control h-9 rounded-lg border border-(--cui-color-stroke-default) bg-(--syn-surface) px-2 text-[13px] text-(--cui-color-text-default)';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="m-0 text-sm font-semibold text-(--cui-color-text-default)">{title}</h3>
      {children}
    </section>
  );
}

function CurrentPrice({ price }: { price: t.PriceBlock }) {
  const localize = useLocalize();
  const rows: { label: string; value: string }[] = [
    { label: localize('com_prices_field_prompt'), value: formatRate(price.prompt) },
    { label: localize('com_prices_field_completion'), value: formatRate(price.completion) },
    { label: localize('com_prices_field_cacheRead'), value: formatRateOrDash(price.cacheRead) },
    { label: localize('com_prices_field_cacheWrite'), value: formatRateOrDash(price.cacheWrite) },
    ...otherPrices(price).map(({ field, value }) => ({
      label: localize(`com_prices_field_${field}`),
      value: formatRate(value),
    })),
  ];
  return (
    <>
      <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-[13px] tabular-nums">
        {rows.map(({ label, value }) => (
          <div key={label} className="contents">
            <dt className="text-(--cui-color-text-muted)">{label}</dt>
            <dd className="m-0 text-right">{value}</dd>
          </div>
        ))}
      </dl>
      {price.tiers.map((tier) => (
        <div
          key={tier.minPromptTokens}
          className="rounded-lg bg-(--cui-color-background-muted) px-3 py-2 text-[13px] tabular-nums"
        >
          <strong>
            {localize('com_prices_tier_from', { tokens: tierLabel(tier.minPromptTokens) })}
          </strong>
          <span className="ml-2 text-(--cui-color-text-muted)">
            {localize('com_prices_field_prompt')} {formatRate(tier.prompt)} ·{' '}
            {localize('com_prices_field_completion')} {formatRate(tier.completion)}
            {tier.cacheRead == null
              ? ''
              : ` · ${localize('com_prices_field_cacheRead')} ${formatRate(tier.cacheRead)}`}
          </span>
        </div>
      ))}
      <p className="m-0 text-xs text-(--cui-color-text-muted)">
        {localize('com_prices_per_million')}
      </p>
    </>
  );
}

function WhatChanged({ detail }: { detail: t.ModelPriceDetail }) {
  const localize = useLocalize();
  const [showAll, setShowAll] = useState(false);
  const hasPrevious = detail.versions.some((version) => version.previous);
  if (!hasPrevious) {
    return (
      <p className="m-0 text-[13px] text-(--cui-color-text-muted)">
        {localize('com_prices_first_price')}
      </p>
    );
  }
  const lines = showAll
    ? detail.lastChange
    : detail.lastChange.filter((line) => line.kind !== 'unchanged');
  return (
    <>
      {lines.length === 0 ? (
        <p className="m-0 text-[13px] text-(--cui-color-text-muted)">
          {localize('com_prices_no_diff')}
        </p>
      ) : (
        <DiffTable lines={lines} />
      )}
      <button
        type="button"
        aria-pressed={showAll}
        onClick={() => setShowAll((value) => !value)}
        className={cn(buttonClass, 'w-fit')}
      >
        {localize(showAll ? 'com_prices_hide_unchanged' : 'com_prices_show_unchanged')}
      </button>
    </>
  );
}

function CostEffect({ effect }: { effect: t.PriceCostEffect | null }) {
  const localize = useLocalize();
  if (!effect || effect.calls === 0) {
    return (
      <p className="m-0 text-[13px] text-(--cui-color-text-muted)">
        {localize('com_prices_effect_none')}
      </p>
    );
  }
  const { atPreviousUsd, differenceUsd } = effect;
  const params = {
    days: effect.windowDays,
    calls: effect.calls.toLocaleString('en-US'),
    current: formatUsd(effect.atCurrentUsd),
  };
  return (
    <>
      <p className="m-0 text-[13px]">
        {atPreviousUsd == null || differenceUsd == null
          ? localize('com_prices_effect_first', params)
          : localize('com_prices_effect', {
              ...params,
              previous: formatUsd(atPreviousUsd),
              difference: `${differenceUsd >= 0 ? '+' : '−'}${formatUsd(Math.abs(differenceUsd))}`,
            })}
      </p>
      <p className="m-0 text-xs text-(--cui-color-text-muted)">
        {localize('com_prices_effect_recorded', { recorded: formatUsd(effect.recordedUsd) })}
        {effect.truncated ? ` ${localize('com_prices_effect_truncated')}` : ''}
      </p>
    </>
  );
}

function History({ detail }: { detail: t.ModelPriceDetail }) {
  const localize = useLocalize();
  const { versions, model } = detail;
  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);
  const diff = usePriceDiff(model.modelId, from, to);
  const options = (
    value: number | null,
    onChange: (next: number | null) => void,
    label: string,
  ) => (
    <label className="flex flex-col gap-1 text-xs text-(--cui-color-text-muted)">
      {label}
      <select
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
        className={selectClass}
      >
        <option value="">—</option>
        {versions.map((item) => (
          <option key={item.version} value={item.version}>
            {localize('com_prices_version', { version: item.version })} ·{' '}
            {formatDateTime(item.effectiveFrom)}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <>
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {versions.map((item) => (
          <li
            key={item.version}
            className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-lg border border-(--cui-color-stroke-muted) px-3 py-2 text-[13px]"
          >
            <span className="font-semibold">
              {localize('com_prices_version', { version: item.version })} ·{' '}
              {formatDateTime(item.effectiveFrom)}
            </span>
            <span className="text-xs text-(--cui-color-text-muted)">
              {localize(`com_prices_vsource_${item.source}`)}
              {item.actor ? ` · ${item.actor}` : ''}
            </span>
            <span className="w-full tabular-nums">
              {formatRate(item.price.prompt)} / {formatRate(item.price.completion)}
              {item.note ? (
                <span className="block text-xs break-words text-(--cui-color-text-muted)">
                  {item.note}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
      {versions.length > 1 ? (
        <div className="flex flex-col gap-2.5">
          <h4 className="m-0 text-[13px] font-semibold">{localize('com_prices_compare')}</h4>
          <div className="flex flex-wrap gap-3">
            {options(from, setFrom, localize('com_prices_compare_from'))}
            {options(to, setTo, localize('com_prices_compare_to'))}
          </div>
          {diff.isLoading ? <LoadingState className="py-4 text-sm" /> : null}
          {diff.isError ? (
            <EmptyState message={diff.error.message} className="text-sm text-(--syn-danger-fg)" />
          ) : null}
          {diff.data ? (
            <DiffTable lines={diff.data.diff.filter((line) => line.kind !== 'unchanged')} />
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function OverrideBar({ row }: { row: t.ModelPriceRow }) {
  const localize = useLocalize();
  const [open, setOpen] = useState(false);
  const clear = useClearOverride(() => notifySuccess(localize('com_prices_override_cleared')));
  const { override } = row;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-(--cui-color-stroke-default) p-3">
      {override ? (
        <p className="m-0 text-[13px]">
          <strong>{localize('com_prices_manual_active')}</strong> {override.reason}
          <span className="block text-xs text-(--cui-color-text-muted)">
            {localize('com_prices_set_by', { name: override.setBy ?? '—' })} ·{' '}
            {formatDateTime(override.setAt)}
            {override.until
              ? ` · ${localize('com_prices_until', { date: formatDateTime(override.until) })}`
              : ''}
          </span>
        </p>
      ) : (
        <p className="m-0 text-[13px] text-(--cui-color-text-muted)">
          {localize('com_prices_manual_none')}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setOpen(true)} className={buttonClass}>
          {localize(override ? 'com_prices_override_change' : 'com_prices_override_set')}
        </button>
        {override ? (
          <button
            type="button"
            disabled={clear.isPending}
            onClick={() =>
              clear.mutate(row.modelId, { onError: (error: Error) => notifyError(error.message) })
            }
            className={buttonClass}
          >
            {localize('com_prices_override_clear')}
          </button>
        ) : null}
      </div>
      {open ? <OverrideDialog row={row} open onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

function Body({ detail }: { detail: t.ModelPriceDetail }) {
  const localize = useLocalize();
  const { model } = detail;
  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <PriceStatus status={model.status} />
        <span className="text-xs text-(--cui-color-text-muted)">
          {model.source == null
            ? null
            : localize(
                model.source === 'manual'
                  ? 'com_prices_source_manual'
                  : 'com_prices_source_openrouter',
              )}
          {model.fetchedAt
            ? ` · ${localize('com_prices_fetched', { date: formatDateTime(model.fetchedAt) })}`
            : ''}
        </span>
      </div>
      <OverrideBar row={model} />
      <Section title={localize('com_prices_current')}>
        {model.price ? (
          <CurrentPrice price={model.price} />
        ) : (
          <p className="m-0 text-[13px] text-(--syn-danger-fg)">
            {localize('com_prices_no_price_note')}
          </p>
        )}
      </Section>
      <Section title={localize('com_prices_changed')}>
        <WhatChanged detail={detail} />
      </Section>
      <Section title={localize('com_prices_effect_title')}>
        <CostEffect effect={detail.costEffect} />
      </Section>
      <Section title={localize('com_prices_history')}>
        <History detail={detail} />
      </Section>
    </div>
  );
}

/** Right-hand panel for one model: price, last change, cost effect, history and the manual override. */
export function PriceDrawer({ modelId, onClose }: { modelId: string | null; onClose: () => void }) {
  const localize = useLocalize();
  const query = useModelPrice(modelId);
  const open = modelId != null;
  const content = () => {
    if (query.isLoading || !query.data) {
      return query.isError ? (
        <EmptyState message={query.error?.message || localize('com_prices_failed')} />
      ) : (
        <LoadingState />
      );
    }
    return <Body detail={query.data} />;
  };
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-(--z-overlay) bg-black/30 backdrop-blur-[1px]',
            'data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in',
          )}
        />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            'fixed top-0 right-0 z-(--z-overlay) flex h-full w-full flex-col bg-(--cui-color-background-panel) shadow-xl sm:w-160',
            'border-l border-(--cui-color-stroke-default)',
            'data-[state=closed]:animate-drawer-out data-[state=open]:animate-drawer-in',
          )}
        >
          <header className="flex items-center justify-between gap-3 border-b border-(--cui-color-stroke-default) px-4 py-3">
            <div className="flex min-w-0 flex-col">
              <Dialog.Title className="m-0 truncate text-sm font-semibold text-(--cui-color-text-default)">
                {query.data?.model.name ?? localize('com_prices_drawer_title')}
              </Dialog.Title>
              <span className="truncate font-mono text-[11px] text-(--cui-color-text-muted)">
                {modelId}
              </span>
            </div>
            <IconButton
              icon="cross"
              type="ghost"
              size="sm"
              aria-label={localize('com_prices_close')}
              onClick={onClose}
            />
          </header>
          {content()}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
