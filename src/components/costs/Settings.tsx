import { useState } from 'react';
import type * as t from '@/types';
import { Card } from '@/components/shared';
import { notifyError, notifySuccess } from '@/utils';
import { useCostSettings, useLocalize, useSaveCostSettings } from '@/hooks';

const inputClass =
  'admin-themed-control h-10 rounded-lg border border-(--cui-color-stroke-default) bg-(--syn-surface) px-2 text-sm text-(--cui-color-text-default)';

interface DraftItem extends t.FixedCostItem {
  amount: number;
}

function SettingsFields({ settings }: { settings: t.CostSettings }) {
  const localize = useLocalize();
  const [rate, setRate] = useState(String(settings.bdtPerUsd));
  const [fee, setFee] = useState(String(settings.providerFeePercent));
  const [items, setItems] = useState<DraftItem[]>(settings.fixedCosts);
  const save = useSaveCostSettings(() => notifySuccess(localize('com_costs_settings_saved')));

  const update = (index: number, patch: Partial<DraftItem>) =>
    setItems((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const submit = () => {
    const bdtPerUsd = Number(rate);
    const providerFeePercent = Number(fee);
    if (!Number.isFinite(bdtPerUsd) || bdtPerUsd < 1 || !Number.isFinite(providerFeePercent)) {
      notifyError(localize('com_costs_settings_invalid'));
      return;
    }
    if (items.some((item) => !item.label.trim())) {
      notifyError(localize('com_costs_fixed_label_required'));
      return;
    }
    save.mutate(
      { bdtPerUsd, providerFeePercent, fixedCosts: items },
      { onError: (error: Error) => notifyError(error.message) },
    );
  };

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-(--cui-color-text-muted)">
          {localize('com_costs_rate')}
          <input
            type="number"
            min={1}
            step="0.01"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            className={`${inputClass} w-40`}
          />
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-(--cui-color-text-muted)">
          {localize('com_costs_fee')}
          <input
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={fee}
            onChange={(event) => setFee(event.target.value)}
            className={`${inputClass} w-40`}
          />
        </label>
      </div>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 p-0 text-[13px] font-semibold text-(--cui-color-text-muted)">
          {localize('com_costs_fixed')}
        </legend>
        {items.length === 0 ? (
          <p className="m-0 text-[13px] text-(--cui-color-text-muted)">
            {localize('com_costs_fixed_none')}
          </p>
        ) : null}
        {items.map((item, index) => (
          <div key={item.id ?? `new-${index}`} className="flex flex-wrap items-center gap-2">
            <input
              aria-label={localize('com_costs_fixed_label')}
              value={item.label}
              onChange={(event) => update(index, { label: event.target.value })}
              className={`${inputClass} min-w-48 flex-1`}
            />
            <input
              aria-label={localize('com_costs_fixed_amount')}
              type="number"
              min={0}
              step="0.01"
              value={item.amount}
              onChange={(event) => update(index, { amount: Number(event.target.value) })}
              className={`${inputClass} w-32`}
            />
            <select
              aria-label={localize('com_costs_fixed_currency')}
              value={item.currency}
              onChange={(event) => update(index, { currency: event.target.value as 'USD' | 'BDT' })}
              className={inputClass}
            >
              <option value="USD">USD</option>
              <option value="BDT">BDT</option>
            </select>
            <button
              type="button"
              onClick={() => setItems((list) => list.filter((_, i) => i !== index))}
              className="h-10 cursor-pointer rounded-lg border border-(--cui-color-stroke-default) bg-transparent px-3 text-[13px] text-(--cui-color-text-muted) hover:bg-(--cui-color-background-hover)"
            >
              {localize('com_costs_fixed_remove')}
            </button>
          </div>
        ))}
        <div>
          <button
            type="button"
            onClick={() => setItems((list) => [...list, { label: '', amount: 0, currency: 'USD' }])}
            className="h-9 cursor-pointer rounded-lg border border-(--cui-color-stroke-default) bg-transparent px-3 text-[13px] font-semibold text-(--cui-color-text-default) hover:bg-(--cui-color-background-hover)"
          >
            {localize('com_costs_fixed_add')}
          </button>
        </div>
      </fieldset>
      <div>
        <button
          type="submit"
          disabled={save.isPending}
          className="h-10 cursor-pointer rounded-lg border-0 bg-(--syn-brand) px-4 text-sm font-semibold text-(--syn-on-brand) disabled:cursor-wait disabled:opacity-60"
        >
          {save.isPending ? localize('com_costs_settings_saving') : localize('com_ui_save')}
        </button>
      </div>
    </form>
  );
}

/** Exchange rate, OpenRouter top-up fee and the monthly fixed costs. */
export function CostSettingsCard() {
  const localize = useLocalize();
  const { data, isLoading, isError } = useCostSettings();
  return (
    <Card title={localize('com_costs_settings')} description={localize('com_costs_settings_desc')}>
      {isLoading ? <p className="m-0 text-sm">{localize('com_costs_loading')}</p> : null}
      {isError ? (
        <p className="m-0 text-sm text-(--syn-danger-fg)">
          {localize('com_costs_settings_failed')}
        </p>
      ) : null}
      {data ? (
        <SettingsFields key={data.settings.updatedAt ?? 'initial'} settings={data.settings} />
      ) : null}
    </Card>
  );
}
