import { useEffect, useState } from 'react';
import { Button } from '@clickhouse/click-ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type * as t from '@/types';
import {
  listUsagePackagesFn,
  setUserUsagePackageFn,
  clearUserUsagePackageFn,
  setInstitutionUsagePackageFn,
  clearInstitutionUsagePackageFn,
} from '@/server';
import { formatTaka, formatUsd, notifyError, notifySuccess, INDIVIDUAL_ACCOUNT } from '@/utils';
import { Card, LoadingState } from '@/components/shared';
import { PACKAGES_QUERY_KEY } from './keys';
import { useLocalize } from '@/hooks';

const SELECT_CLASS =
  'admin-themed-control w-full rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)';

/** All packages, archived included, so a current assignment to an archived package still shows. */
function usePackages() {
  return useQuery({
    queryKey: [...PACKAGES_QUERY_KEY, true],
    queryFn: () => listUsagePackagesFn({ data: { includeArchived: true } }),
  });
}

function optionLabel(pkg: t.UsagePackage, localize: ReturnType<typeof useLocalize>): string {
  const allowance = localize('com_assign_option', {
    name: pkg.name,
    monthly: formatTaka(pkg.monthlyCredit),
    weekly: formatUsd(pkg.weeklyUsd),
  });
  return pkg.active ? allowance : `${allowance} · ${localize('com_packages_status_archived')}`;
}

function PackageSelect({
  id,
  label,
  value,
  scope,
  packages,
  noneLabel,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  scope: t.UsagePackageScope;
  packages: t.UsagePackage[];
  noneLabel: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const localize = useLocalize();
  /** Only active packages for this kind of account can be chosen; the current one always shows. */
  const options = packages.filter(
    (pkg) => pkg.key === value || (pkg.active && pkg.scopes.includes(scope)),
  );
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-sm text-(--cui-color-text-default)">
      <span className="font-medium">{label}</span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={SELECT_CLASS}
      >
        <option value="">{noneLabel}</option>
        {options.map((pkg) => (
          <option key={pkg.key} value={pkg.key}>
            {optionLabel(pkg, localize)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function InstitutionPackageCard({
  tenantId,
  current,
}: {
  tenantId: string;
  current?: t.InstitutionUsagePackage | null;
}) {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const packagesQuery = usePackages();
  const [own, setOwn] = useState(current?.packageKey ?? '');
  const [member, setMember] = useState(current?.memberPackageKey ?? '');

  useEffect(() => {
    setOwn(current?.packageKey ?? '');
    setMember(current?.memberPackageKey ?? '');
  }, [current?.packageKey, current?.memberPackageKey]);

  const onSaved = (message: string) => {
    notifySuccess(message);
    queryClient.invalidateQueries({ queryKey: ['platformInstitution', tenantId] });
  };
  const save = useMutation({
    mutationFn: () =>
      own || member
        ? setInstitutionUsagePackageFn({
            data: { tenantId, packageKey: own || null, memberPackageKey: member || null },
          })
        : clearInstitutionUsagePackageFn({ data: { tenantId } }),
    onSuccess: () => onSaved(localize('com_assign_saved')),
    onError: (error: Error) => notifyError(error.message),
  });

  const changed =
    own !== (current?.packageKey ?? '') || member !== (current?.memberPackageKey ?? '');
  const packages = packagesQuery.data?.packages ?? [];

  return (
    <Card
      title={localize('com_assign_institution_title')}
      description={localize('com_assign_institution_description')}
      className="md:col-span-2"
      action={
        <Button
          type="primary"
          label={localize('com_ui_save')}
          disabled={!changed || save.isPending}
          onClick={() => save.mutate()}
        />
      }
    >
      {packagesQuery.isLoading ? (
        <LoadingState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <PackageSelect
            id="institution-package"
            label={localize('com_assign_institution_own')}
            value={own}
            scope="institution"
            packages={packages}
            noneLabel={localize('com_assign_none_institution')}
            disabled={save.isPending}
            onChange={setOwn}
          />
          <PackageSelect
            id="institution-member-package"
            label={localize('com_assign_institution_members')}
            value={member}
            scope="member"
            packages={packages}
            noneLabel={localize('com_assign_none_member')}
            disabled={save.isPending}
            onChange={setMember}
          />
        </div>
      )}
      <p className="m-0 text-[13px] text-(--cui-color-text-muted)">
        {localize(own || member ? 'com_assign_credit_note' : 'com_assign_token_note')}
      </p>
    </Card>
  );
}

/** The package everyone outside an institution gets until they are assigned their own. */
export function TrialPackageCard({ current }: { current?: string | null }) {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const packagesQuery = usePackages();
  const [trial, setTrial] = useState(current ?? '');

  useEffect(() => setTrial(current ?? ''), [current]);

  const save = useMutation({
    mutationFn: () =>
      trial
        ? setInstitutionUsagePackageFn({
            data: { tenantId: INDIVIDUAL_ACCOUNT, packageKey: null, memberPackageKey: trial },
          })
        : clearInstitutionUsagePackageFn({ data: { tenantId: INDIVIDUAL_ACCOUNT } }),
    onSuccess: () => {
      notifySuccess(localize('com_assign_saved'));
      queryClient.invalidateQueries({ queryKey: ['platformInstitutionQuota', INDIVIDUAL_ACCOUNT] });
    },
    onError: (error: Error) => notifyError(error.message),
  });

  return (
    <Card
      title={localize('com_assign_trial_title')}
      description={localize('com_assign_trial_description')}
      action={
        <Button
          type="primary"
          label={localize('com_ui_save')}
          disabled={trial === (current ?? '') || save.isPending}
          onClick={() => save.mutate()}
        />
      }
    >
      {packagesQuery.isLoading ? (
        <LoadingState />
      ) : (
        <PackageSelect
          id="trial-package"
          label={localize('com_assign_trial_label')}
          value={trial}
          scope="member"
          packages={packagesQuery.data?.packages ?? []}
          noneLabel={localize('com_assign_none_trial')}
          disabled={save.isPending}
          onChange={setTrial}
        />
      )}
      <p className="m-0 text-[13px] text-(--cui-color-text-muted)">
        {localize('com_assign_trial_note')}
      </p>
    </Card>
  );
}

const OVERRIDE_DAYS = 90;
const DAY_MS = 86_400_000;
/** Kept off the 90-day limit so a browser clock slightly ahead of Synapse's is still accepted. */
const OVERRIDE_MARGIN_MS = 3_600_000;
const REASON_MIN = 3;
const REASON_MAX = 500;

/** A date input value (YYYY-MM-DD) as the end of that day in local time, as an ISO instant. */
function endOfDay(date: string): string | null {
  if (!date) return null;
  const end = new Date(`${date}T23:59:59`);
  return Number.isNaN(end.getTime()) ? null : end.toISOString();
}

/** A moment as a date input value (YYYY-MM-DD) in local time. */
function dateValue(time: number): string {
  const date = new Date(time);
  return new Date(time - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** The end of the chosen day, held inside the 90 days a bdren.ai-managed override may last. */
function overrideEnd(date: string, now: number): string | null {
  const end = endOfDay(date);
  if (!end) return null;
  const cap = now + OVERRIDE_DAYS * DAY_MS - OVERRIDE_MARGIN_MS;
  return new Date(Math.min(new Date(end).getTime(), cap)).toISOString();
}

/** Synapse refuses a reason outside 3–500 characters, and needs one for a managed user. */
function reasonValid(reason: string, required: boolean): boolean {
  if (!reason) return !required;
  return reason.length >= REASON_MIN && reason.length <= REASON_MAX;
}

/** A managed user's override must end, and no later than the 90-day limit. */
function expiresValid(expires: string, required: boolean, latest: string): boolean {
  if (!required) return true;
  return expires !== '' && expires <= latest;
}

function memberDescription(managed: boolean, standalone: boolean): t.TranslationKeys {
  if (managed) return 'com_assign_override_description';
  return standalone ? 'com_assign_member_description_standalone' : 'com_assign_member_description';
}

function shortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

/** bdren.ai's live override for this person, and whether Synapse's own one is on top of it. */
function BdrenOverrideNote({
  override,
  alsoSynapse,
}: {
  override: t.BdrenOverride;
  alsoSynapse: boolean;
}) {
  const localize = useLocalize();
  const change = override.packageName ?? localize('com_assign_bdren_override_limits');
  const key =
    override.scope === 'institution'
      ? 'com_assign_bdren_override_institution'
      : 'com_assign_bdren_override';
  return (
    <p role="status" className="m-0 text-[13px] text-(--cui-color-text-default)">
      {localize(key, { change, ends: shortDate(override.endsAt) })}
      {alsoSynapse ? ` ${localize('com_assign_both_overrides')}` : null}
    </p>
  );
}

export function MemberPackageCard({
  userId,
  current,
  standalone = false,
  managed = false,
  bdrenOverride = null,
}: {
  userId: string;
  current?: t.MemberUsagePackage | null;
  /** A person outside any institution falls back to the trial package, not an institution default. */
  standalone?: boolean;
  /** bdren.ai supplies this person's limits: a package here is an emergency override. */
  managed?: boolean;
  /** bdren.ai's live override for this person, shown so support sees both. */
  bdrenOverride?: t.BdrenOverride | null;
}) {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const packagesQuery = usePackages();
  const [key, setKey] = useState(current?.packageKey ?? '');
  const [expires, setExpires] = useState(current?.expiresAt?.slice(0, 10) ?? '');
  const [reason, setReason] = useState(current?.reason ?? '');

  useEffect(() => {
    setKey(current?.packageKey ?? '');
    setExpires(current?.expiresAt?.slice(0, 10) ?? '');
    setReason(current?.reason ?? '');
  }, [current?.packageKey, current?.expiresAt, current?.reason]);

  const now = Date.now();
  const today = dateValue(now);
  const latest = dateValue(now + OVERRIDE_DAYS * DAY_MS);
  const trimmed = reason.trim();

  const save = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!key) {
        await clearUserUsagePackageFn({ data: { userId } });
        return;
      }
      const expiresAt = managed ? overrideEnd(expires, Date.now()) : endOfDay(expires);
      await setUserUsagePackageFn({
        data: { userId, packageKey: key, expiresAt, ...(trimmed ? { reason: trimmed } : {}) },
      });
    },
    onSuccess: () => {
      notifySuccess(localize('com_assign_saved'));
      queryClient.invalidateQueries({ queryKey: ['user-detail', userId] });
    },
    onError: (error: Error) => notifyError(error.message),
  });

  const changed =
    key !== (current?.packageKey ?? '') ||
    expires !== (current?.expiresAt?.slice(0, 10) ?? '') ||
    reason !== (current?.reason ?? '');
  const valid = !key || (reasonValid(trimmed, managed) && expiresValid(expires, managed, latest));

  return (
    <Card
      title={localize('com_assign_member_title')}
      description={localize(memberDescription(managed, standalone))}
      className="md:col-span-2"
      action={
        <Button
          type="primary"
          label={localize('com_ui_save')}
          disabled={!changed || !valid || save.isPending}
          onClick={() => save.mutate()}
        />
      }
    >
      {managed ? (
        <p className="m-0 text-[13px] text-(--cui-color-text-muted)">
          {localize('com_assign_override_note')}
        </p>
      ) : null}
      {managed && bdrenOverride ? (
        <BdrenOverrideNote override={bdrenOverride} alsoSynapse={current?.override === true} />
      ) : null}
      {packagesQuery.isLoading ? (
        <LoadingState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <PackageSelect
            id="member-package"
            label={localize('com_assign_member_own')}
            value={key}
            scope="member"
            packages={packagesQuery.data?.packages ?? []}
            noneLabel={localize(standalone ? 'com_assign_use_trial' : 'com_assign_use_default')}
            disabled={save.isPending}
            onChange={setKey}
          />
          <label
            htmlFor="member-package-expiry"
            className="flex flex-col gap-1.5 text-sm text-(--cui-color-text-default)"
          >
            <span className="font-medium">
              {localize(managed ? 'com_assign_override_ends' : 'com_assign_expires')}
            </span>
            <input
              id="member-package-expiry"
              type="date"
              value={expires}
              min={today}
              max={managed ? latest : undefined}
              required={managed}
              disabled={!key || save.isPending}
              onChange={(event) => setExpires(event.target.value)}
              className={SELECT_CLASS}
            />
          </label>
          <div className="flex flex-col gap-1.5 text-sm text-(--cui-color-text-default) md:col-span-2">
            <label htmlFor="member-package-reason" className="font-medium">
              {localize(managed ? 'com_assign_reason' : 'com_assign_reason_optional')}
            </label>
            <textarea
              id="member-package-reason"
              rows={2}
              value={reason}
              maxLength={REASON_MAX}
              required={managed}
              aria-describedby="member-package-reason-hint"
              placeholder={localize('com_assign_reason_placeholder')}
              disabled={!key || save.isPending}
              onChange={(event) => setReason(event.target.value)}
              className={SELECT_CLASS}
            />
            <span
              id="member-package-reason-hint"
              className="text-[13px] text-(--cui-color-text-muted)"
            >
              {localize('com_assign_reason_hint')}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
