import { useEffect, useState } from 'react';
import { Button, NumberField } from '@clickhouse/click-ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type * as t from '@/types';
import { effectiveRate, notifyError, notifySuccess, parseAmount } from '@/utils';
import { updateUsagePricingFn } from '@/server';
import { Card } from '@/components/shared';
import { useLocalize } from '@/hooks';
import { PACKAGES_QUERY_KEY } from './keys';

type PricingForm = { bdtPerUsd: string; providerFeePercent: string; defaultWeeklyPercent: string };

function toForm(pricing: t.UsagePricingInput): PricingForm {
  return {
    bdtPerUsd: String(pricing.bdtPerUsd),
    providerFeePercent: String(pricing.providerFeePercent),
    defaultWeeklyPercent: String(pricing.defaultWeeklyPercent),
  };
}

/** The parsed form, or `null` while any value is out of the range the server accepts. */
function parsePricing(form: PricingForm): t.UsagePricingInput | null {
  const bdtPerUsd = parseAmount(form.bdtPerUsd);
  const providerFeePercent = parseAmount(form.providerFeePercent);
  const defaultWeeklyPercent = parseAmount(form.defaultWeeklyPercent);
  if (bdtPerUsd == null || bdtPerUsd < 1) return null;
  if (providerFeePercent == null || providerFeePercent < 0 || providerFeePercent > 100) return null;
  if (defaultWeeklyPercent == null || defaultWeeklyPercent < 1 || defaultWeeklyPercent > 100) {
    return null;
  }
  return { bdtPerUsd, providerFeePercent, defaultWeeklyPercent };
}

export function PricingCard({ pricing }: { pricing: t.UsagePricing }) {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PricingForm>(() => toForm(pricing));

  useEffect(() => setForm(toForm(pricing)), [pricing]);

  const parsed = parsePricing(form);
  const dirty =
    parsed != null &&
    (parsed.bdtPerUsd !== pricing.bdtPerUsd ||
      parsed.providerFeePercent !== pricing.providerFeePercent ||
      parsed.defaultWeeklyPercent !== pricing.defaultWeeklyPercent);

  const mutation = useMutation({
    mutationFn: (data: t.UsagePricingInput) => updateUsagePricingFn({ data }),
    onSuccess: () => {
      notifySuccess(localize('com_pricing_saved'));
      queryClient.invalidateQueries({ queryKey: PACKAGES_QUERY_KEY });
    },
    onError: (error: Error) => notifyError(error.message),
  });

  /** Saving unchanged defaults is allowed: it records them as a deliberate choice. */
  const canSave = parsed != null && (dirty || !pricing.configured) && !mutation.isPending;

  const set = (field: keyof PricingForm) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  return (
    <Card
      title={localize('com_pricing_title')}
      description={localize('com_pricing_description')}
      action={
        <Button
          type="primary"
          label={localize('com_pricing_save')}
          disabled={!canSave}
          onClick={() => parsed && mutation.mutate(parsed)}
        />
      }
    >
      {!pricing.configured ? (
        <p
          role="status"
          className="m-0 rounded-lg bg-(--syn-warning-bg) px-3 py-2 text-[13px] text-(--syn-warning-fg)"
        >
          {localize('com_pricing_defaults_note')}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <NumberField
          label={localize('com_pricing_rate')}
          value={form.bdtPerUsd}
          min={1}
          step="0.01"
          onChange={set('bdtPerUsd')}
        />
        <NumberField
          label={localize('com_pricing_fee')}
          value={form.providerFeePercent}
          min={0}
          max={100}
          step="0.1"
          onChange={set('providerFeePercent')}
        />
        <NumberField
          label={localize('com_pricing_weekly')}
          value={form.defaultWeeklyPercent}
          min={1}
          max={100}
          onChange={set('defaultWeeklyPercent')}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-(--cui-color-text-muted)">
        <span>
          {parsed
            ? localize('com_pricing_effective', { rate: effectiveRate(parsed).toFixed(2) })
            : localize('com_pricing_invalid')}
        </span>
        {pricing.updatedAt ? (
          <span>
            {localize('com_pricing_updated', {
              date: new Date(pricing.updatedAt).toLocaleString(),
            })}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
