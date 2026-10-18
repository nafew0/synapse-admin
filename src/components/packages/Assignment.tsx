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

/** A date input value (YYYY-MM-DD) as the end of that day in local time, as an ISO instant. */
function endOfDay(date: string): string | null {
  if (!date) return null;
  const end = new Date(`${date}T23:59:59`);
  return Number.isNaN(end.getTime()) ? null : end.toISOString();
}

export function MemberPackageCard({
  userId,
  current,
  standalone = false,
}: {
  userId: string;
  current?: t.MemberUsagePackage | null;
  /** A person outside any institution falls back to the trial package, not an institution default. */
  standalone?: boolean;
}) {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const packagesQuery = usePackages();
  const [key, setKey] = useState(current?.packageKey ?? '');
  const [expires, setExpires] = useState(current?.expiresAt?.slice(0, 10) ?? '');

  useEffect(() => {
    setKey(current?.packageKey ?? '');
    setExpires(current?.expiresAt?.slice(0, 10) ?? '');
  }, [current?.packageKey, current?.expiresAt]);

  const save = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!key) {
        await clearUserUsagePackageFn({ data: { userId } });
        return;
      }
      await setUserUsagePackageFn({
        data: { userId, packageKey: key, expiresAt: endOfDay(expires) },
      });
    },
    onSuccess: () => {
      notifySuccess(localize('com_assign_saved'));
      queryClient.invalidateQueries({ queryKey: ['user-detail', userId] });
    },
    onError: (error: Error) => notifyError(error.message),
  });

  const changed =
    key !== (current?.packageKey ?? '') || expires !== (current?.expiresAt?.slice(0, 10) ?? '');

  return (
    <Card
      title={localize('com_assign_member_title')}
      description={localize(
        standalone ? 'com_assign_member_description_standalone' : 'com_assign_member_description',
      )}
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
            <span className="font-medium">{localize('com_assign_expires')}</span>
            <input
              id="member-package-expiry"
              type="date"
              value={expires}
              disabled={!key || save.isPending}
              onChange={(event) => setExpires(event.target.value)}
              className={SELECT_CLASS}
            />
          </label>
        </div>
      )}
    </Card>
  );
}
