import { useState } from 'react';
import { NumberField, Switch, TextField } from '@clickhouse/click-ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type * as t from '@/types';
import {
  formatUsd,
  notifyError,
  parseAmount,
  toPackageKey,
  notifySuccess,
  previewPackage,
} from '@/utils';
import { createUsagePackageFn, updateUsagePackageFn } from '@/server';
import { FormDialog } from '@/components/shared';
import { useLocalize } from '@/hooks';
import { PACKAGES_QUERY_KEY } from './keys';

const SCOPES: { value: t.UsagePackageScope; labelKey: t.TranslationKeys }[] = [
  { value: 'member', labelKey: 'com_packages_scope_member' },
  { value: 'institution', labelKey: 'com_packages_scope_institution' },
];

type PackageForm = {
  key: string;
  keyEdited: boolean;
  name: string;
  description: string;
  scopes: t.UsagePackageScope[];
  price: string;
  monthlyCredit: string;
  weeklyPercent: string;
  unlimited: boolean;
  sortOrder: string;
};

function toForm(pkg: t.UsagePackage | null): PackageForm {
  if (!pkg) {
    return {
      key: '',
      keyEdited: false,
      name: '',
      description: '',
      scopes: ['member'],
      price: '',
      monthlyCredit: '',
      weeklyPercent: '',
      unlimited: false,
      sortOrder: '0',
    };
  }
  return {
    key: pkg.key,
    keyEdited: true,
    name: pkg.name,
    description: pkg.description,
    scopes: pkg.scopes,
    price: String(pkg.price),
    monthlyCredit: String(pkg.monthlyCredit),
    weeklyPercent: pkg.weeklyPercent == null ? '' : String(pkg.weeklyPercent),
    unlimited: pkg.unlimited,
    sortOrder: String(pkg.sortOrder),
  };
}

type ParsedForm = { input: Omit<t.UsagePackageInput, 'active'>; key: string };

/** The submittable package, or the key of the message explaining what is missing. */
function parseForm(form: PackageForm): ParsedForm | t.TranslationKeys {
  const monthlyCredit = parseAmount(form.monthlyCredit);
  const weeklyPercent = parseAmount(form.weeklyPercent);
  if (
    !form.name.trim() ||
    form.key.length < 2 ||
    form.scopes.length === 0 ||
    monthlyCredit == null ||
    monthlyCredit <= 0
  ) {
    return 'com_packages_error_required';
  }
  if (weeklyPercent != null && (weeklyPercent < 1 || weeklyPercent > 100)) {
    return 'com_packages_error_weekly';
  }
  return {
    key: form.key,
    input: {
      name: form.name.trim(),
      description: form.description.trim(),
      scopes: form.scopes,
      price: Math.max(parseAmount(form.price) ?? 0, 0),
      monthlyCredit,
      weeklyPercent,
      unlimited: form.unlimited,
      sortOrder: Math.trunc(parseAmount(form.sortOrder) ?? 0),
    },
  };
}

function Hint({ children }: { children: string }) {
  return <p className="m-0 -mt-1 text-xs text-(--cui-color-text-muted)">{children}</p>;
}

function ValueRatio({ price, monthlyCredit }: { price: number; monthlyCredit: number }) {
  const localize = useLocalize();
  if (price <= 0 || monthlyCredit === price) return null;
  const ratio = monthlyCredit / price;
  return (
    <p className="m-0 text-xs text-(--cui-color-text-muted)">
      {ratio > 1
        ? localize('com_packages_subsidy', { ratio: ratio.toFixed(2) })
        : localize('com_packages_margin', { percent: Math.round(ratio * 100) })}
    </p>
  );
}

function Preview({ form, pricing }: { form: PackageForm; pricing: t.UsagePricing }) {
  const localize = useLocalize();
  const monthlyCredit = parseAmount(form.monthlyCredit) ?? 0;
  const preview = previewPackage(
    { monthlyCredit, weeklyPercent: parseAmount(form.weeklyPercent) },
    pricing,
  );
  const rows: [string, string][] = [
    [localize('com_packages_preview_monthly'), formatUsd(preview.monthlyUsd)],
    [
      localize('com_packages_preview_weekly', { percent: preview.weeklyPercent }),
      formatUsd(preview.weeklyUsd),
    ],
    [localize('com_packages_preview_credits'), preview.monthlyCredits.toLocaleString('en-US')],
  ];
  return (
    <section
      aria-live="polite"
      className="flex flex-col gap-2 rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-muted) p-3"
    >
      <h3 className="m-0 text-[13px] font-semibold text-(--cui-color-text-default)">
        {localize('com_packages_preview')}
      </h3>
      <dl className="m-0 grid grid-cols-3 gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-xs text-(--cui-color-text-muted)">{label}</dt>
            <dd className="m-0 text-sm font-medium text-(--cui-color-text-default) tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <ValueRatio price={parseAmount(form.price) ?? 0} monthlyCredit={monthlyCredit} />
    </section>
  );
}

export function PackageDialog({
  open,
  pkg,
  pricing,
  onClose,
}: {
  open: boolean;
  /** `null` creates a new package. */
  pkg: t.UsagePackage | null;
  pricing: t.UsagePricing;
  onClose: () => void;
}) {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PackageForm>(() => toForm(pkg));
  const [error, setError] = useState('');
  const isEdit = pkg != null;
  const parsed = parseForm(form);

  const mutation = useMutation({
    mutationFn: ({ key, input }: ParsedForm) =>
      isEdit
        ? updateUsagePackageFn({ data: { key, patch: input } })
        : createUsagePackageFn({ data: { ...input, key, active: true } }),
    onSuccess: ({ package: saved }) => {
      notifySuccess(
        localize(isEdit ? 'com_packages_saved' : 'com_packages_created', { name: saved.name }),
      );
      queryClient.invalidateQueries({ queryKey: PACKAGES_QUERY_KEY });
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
      notifyError(err.message);
    },
  });

  const submit = () => {
    if (typeof parsed === 'string') {
      setError(localize(parsed));
      return;
    }
    setError('');
    mutation.mutate(parsed);
  };

  const setName = (name: string) =>
    setForm((current) => ({
      ...current,
      name,
      key: current.keyEdited ? current.key : toPackageKey(name),
    }));

  const toggleScope = (scope: t.UsagePackageScope, checked: boolean) =>
    setForm((current) => ({
      ...current,
      scopes: checked
        ? [...current.scopes, scope]
        : current.scopes.filter((value) => value !== scope),
    }));

  const set =
    (field: 'description' | 'price' | 'monthlyCredit' | 'weeklyPercent' | 'sortOrder') =>
    (value: string) =>
      setForm((current) => ({ ...current, [field]: value }));

  return (
    <FormDialog
      open={open}
      size="lg"
      title={
        isEdit
          ? localize('com_packages_dialog_edit', { name: pkg.name })
          : localize('com_packages_dialog_create')
      }
      submitLabel={localize('com_ui_save')}
      saving={mutation.isPending}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label={localize('com_packages_field_name')}
          value={form.name}
          onChange={setName}
        />
        <div className="flex flex-col gap-2">
          <TextField
            label={localize('com_packages_field_key')}
            value={form.key}
            disabled={isEdit}
            onChange={(value) =>
              setForm((current) => ({ ...current, key: toPackageKey(value), keyEdited: true }))
            }
          />
          <Hint>{localize('com_packages_field_key_hint')}</Hint>
        </div>
      </div>
      <TextField
        label={localize('com_packages_field_description')}
        value={form.description}
        onChange={set('description')}
      />
      <fieldset className="m-0 flex flex-wrap items-center gap-4 border-0 p-0">
        <legend className="mb-2 text-[13px] font-medium text-(--cui-color-text-default)">
          {localize('com_packages_field_scopes')}
        </legend>
        {SCOPES.map((scope) => (
          <label
            key={scope.value}
            className="flex items-center gap-2 text-sm text-(--cui-color-text-default)"
          >
            <input
              type="checkbox"
              checked={form.scopes.includes(scope.value)}
              onChange={(event) => toggleScope(scope.value, event.target.checked)}
            />
            {localize(scope.labelKey)}
          </label>
        ))}
      </fieldset>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <NumberField
            label={localize('com_packages_field_price')}
            value={form.price}
            min={0}
            onChange={set('price')}
          />
          <Hint>{localize('com_packages_field_price_hint')}</Hint>
        </div>
        <div className="flex flex-col gap-2">
          <NumberField
            label={localize('com_packages_field_credit')}
            value={form.monthlyCredit}
            min={0}
            onChange={set('monthlyCredit')}
          />
          <Hint>{localize('com_packages_field_credit_hint')}</Hint>
        </div>
        <div className="flex flex-col gap-2">
          <NumberField
            label={localize('com_packages_field_weekly')}
            value={form.weeklyPercent}
            min={1}
            max={100}
            placeholder={String(pricing.defaultWeeklyPercent)}
            onChange={set('weeklyPercent')}
          />
          <Hint>
            {localize('com_packages_field_weekly_hint', { percent: pricing.defaultWeeklyPercent })}
          </Hint>
        </div>
        <NumberField
          label={localize('com_packages_field_order')}
          value={form.sortOrder}
          onChange={set('sortOrder')}
        />
      </div>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-(--cui-color-text-default)">
            {localize('com_packages_field_unlimited')}
          </span>
          <Hint>{localize('com_packages_field_unlimited_hint')}</Hint>
        </div>
        <Switch
          checked={form.unlimited}
          aria-label={localize('com_packages_field_unlimited')}
          onCheckedChange={(unlimited) => setForm((current) => ({ ...current, unlimited }))}
        />
      </div>
      <Preview form={form} pricing={pricing} />
    </FormDialog>
  );
}
