import { useState } from 'react';
import type * as t from '@/types';
import { formatRate, formatRateOrDash, notifySuccess, parseAmount, tierLabel } from '@/utils';
import { FormDialog } from '@/components/shared';
import { useLocalize, useSetOverride } from '@/hooks';

const inputClass =
  'admin-themed-control h-10 w-full rounded-lg border border-(--cui-color-stroke-default) bg-(--syn-surface) px-2 text-sm text-(--cui-color-text-default)';
const labelClass = 'flex flex-col gap-1 text-[13px] font-semibold text-(--cui-color-text-muted)';

interface OverrideForm {
  prompt: string;
  completion: string;
  cacheRead: string;
  cacheWrite: string;
  tiers: { prompt: string; completion: string }[];
  reason: string;
  until: string;
}

const text = (value?: number): string => (value == null ? '' : String(value));

function toForm(price: t.PriceBlock | null): OverrideForm {
  return {
    prompt: text(price?.prompt),
    completion: text(price?.completion),
    cacheRead: text(price?.cacheRead),
    cacheWrite: text(price?.cacheWrite),
    tiers: (price?.tiers ?? []).map((tier) => ({
      prompt: text(tier.prompt),
      completion: text(tier.completion),
    })),
    reason: '',
    until: '',
  };
}

type Parsed = { price: t.PriceBlock; reason: string; until: string | null };

/** The body to send, or the key of the message saying what is missing. */
function parseForm(form: OverrideForm, base: t.PriceBlock | null): Parsed | t.TranslationKeys {
  const prompt = parseAmount(form.prompt);
  const completion = parseAmount(form.completion);
  const cacheRead = parseAmount(form.cacheRead);
  const cacheWrite = parseAmount(form.cacheWrite);
  const tiers = form.tiers.map((tier) => ({
    prompt: parseAmount(tier.prompt),
    completion: parseAmount(tier.completion),
  }));
  if (prompt == null || completion == null) return 'com_prices_override_error_price';
  if (tiers.some((tier) => tier.prompt == null || tier.completion == null))
    return 'com_prices_override_error_price';
  if (form.reason.trim().length < 3) return 'com_prices_override_error_reason';
  const until = form.until ? new Date(`${form.until}T23:59:59`) : null;
  if (until && until.getTime() <= Date.now()) return 'com_prices_override_error_until';
  const kept = (base?.tiers ?? []).map((tier, index) => ({
    ...tier,
    prompt: tiers[index].prompt ?? tier.prompt,
    completion: tiers[index].completion ?? tier.completion,
  }));
  return {
    price: {
      ...base,
      prompt,
      completion,
      cacheRead: cacheRead ?? undefined,
      cacheWrite: cacheWrite ?? undefined,
      tiers: kept,
    },
    reason: form.reason.trim(),
    until: until ? until.toISOString() : null,
  };
}

/** Sets a manual price for a model: the current price with the edited fields, a reason and an optional end date. */
export function OverrideDialog({
  row,
  open,
  onClose,
}: {
  row: t.ModelPriceRow;
  open: boolean;
  onClose: () => void;
}) {
  const localize = useLocalize();
  const [form, setForm] = useState<OverrideForm>(() => toForm(row.price));
  const [error, setError] = useState<string | undefined>();
  const save = useSetOverride(() => {
    notifySuccess(localize('com_prices_override_saved'));
    onClose();
  });
  const set = (patch: Partial<OverrideForm>) => setForm((prev) => ({ ...prev, ...patch }));

  const submit = () => {
    const parsed = parseForm(form, row.price);
    if (typeof parsed === 'string') {
      setError(localize(parsed));
      return;
    }
    setError(undefined);
    save.mutate(
      { modelId: row.modelId, ...parsed },
      { onError: (failure: Error) => setError(failure.message) },
    );
  };

  const money = (
    key: 'prompt' | 'completion' | 'cacheRead' | 'cacheWrite',
    label: t.TranslationKeys,
  ) => (
    <label className={labelClass}>
      {localize(label)}
      <input
        type="number"
        min={0}
        step="any"
        inputMode="decimal"
        value={form[key]}
        onChange={(event) => set({ [key]: event.target.value })}
        className={inputClass}
      />
    </label>
  );

  return (
    <FormDialog
      open={open}
      size="lg"
      title={localize('com_prices_override_title', { name: row.name })}
      submitLabel={localize('com_prices_override_save')}
      saving={save.isPending}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      <p className="m-0 text-[13px] text-(--cui-color-text-muted)">
        {localize('com_prices_override_desc')}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {money('prompt', 'com_prices_field_prompt')}
        {money('completion', 'com_prices_field_completion')}
        {money('cacheRead', 'com_prices_field_cacheRead')}
        {money('cacheWrite', 'com_prices_field_cacheWrite')}
      </div>
      {form.tiers.map((tier, index) => (
        <fieldset
          key={row.price?.tiers[index]?.minPromptTokens ?? index}
          className="m-0 grid grid-cols-1 gap-3 rounded-lg border border-(--cui-color-stroke-default) p-3 sm:grid-cols-2"
        >
          <legend className="px-1 text-xs text-(--cui-color-text-muted)">
            {localize('com_prices_override_tier', {
              tokens: tierLabel(row.price?.tiers[index]?.minPromptTokens ?? 0),
            })}
          </legend>
          {(['prompt', 'completion'] as const).map((key) => (
            <label key={key} className={labelClass}>
              {localize(`com_prices_field_${key}`)}
              <input
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={tier[key]}
                onChange={(event) =>
                  set({
                    tiers: form.tiers.map((item, at) =>
                      at === index ? { ...item, [key]: event.target.value } : item,
                    ),
                  })
                }
                className={inputClass}
              />
            </label>
          ))}
        </fieldset>
      ))}
      <label className={labelClass}>
        {localize('com_prices_override_reason')}
        <input
          value={form.reason}
          maxLength={500}
          onChange={(event) => set({ reason: event.target.value })}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        {localize('com_prices_override_until')}
        <input
          type="date"
          value={form.until}
          onChange={(event) => set({ until: event.target.value })}
          className={`${inputClass} sm:w-48`}
        />
      </label>
      {row.syncedPrice ? (
        <p className="m-0 text-xs text-(--cui-color-text-muted)">
          {localize('com_prices_override_synced', {
            input: formatRate(row.syncedPrice.prompt),
            output: formatRate(row.syncedPrice.completion),
            cache: formatRateOrDash(row.syncedPrice.cacheRead),
          })}
        </p>
      ) : null}
    </FormDialog>
  );
}
