import { useState } from 'react';
import { Button, Icon } from '@clickhouse/click-ui';
import { getRouteApi } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type * as t from '@/types';
import { archiveUsagePackageFn, listUsagePackagesFn, updateUsagePackageFn } from '@/server';
import { cn, formatTaka, formatUsd, notifyError, notifySuccess } from '@/utils';
import { EmptyState, LoadingState } from '@/components/shared';
import { PackageDialog } from './PackageDialog';
import { PACKAGES_QUERY_KEY } from './keys';
import { PricingCard } from './PricingCard';
import { useLocalize } from '@/hooks';

const Route = getRouteApi('/_app');

const SCOPE_KEYS: Record<t.UsagePackageScope, t.TranslationKeys> = {
  member: 'com_packages_scope_member',
  institution: 'com_packages_scope_institution',
};

const HEADERS: t.TranslationKeys[] = [
  'com_packages_col_package',
  'com_packages_col_scopes',
  'com_packages_col_price',
  'com_packages_col_monthly',
  'com_packages_col_weekly',
  'com_packages_col_status',
  'com_packages_col_actions',
];

type DialogState = { open: false } | { open: true; pkg: t.UsagePackage | null };

function Pill({ tone, children }: { tone: 'neutral' | 'success' | 'info'; children: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        tone === 'success' && 'bg-(--syn-success-bg) text-(--syn-success-fg)',
        tone === 'neutral' && 'bg-(--syn-neutral-bg) text-(--syn-neutral-fg)',
        tone === 'info' && 'bg-(--syn-warning-bg) text-(--syn-warning-fg)',
      )}
    >
      {children}
    </span>
  );
}

function PackageRow({
  pkg,
  busy,
  onEdit,
  onToggleActive,
}: {
  pkg: t.UsagePackage;
  busy: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
}) {
  const localize = useLocalize();
  return (
    <tr className="border-b border-(--cui-color-stroke-default) last:border-b-0">
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2 font-medium text-(--cui-color-text-default)">
            {pkg.name}
            {pkg.unlimited ? <Pill tone="info">{localize('com_packages_unlimited')}</Pill> : null}
          </span>
          <span className="text-xs text-(--cui-color-text-muted)">
            {pkg.description || pkg.key}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {pkg.scopes.map((scope) => (
            <Pill key={scope} tone="neutral">
              {localize(SCOPE_KEYS[scope])}
            </Pill>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 text-(--cui-color-text-default) tabular-nums">
        {formatTaka(pkg.price)}
      </td>
      <td className="px-4 py-3 tabular-nums">
        <div className="flex flex-col">
          <span className="text-(--cui-color-text-default)">{formatTaka(pkg.monthlyCredit)}</span>
          <span className="text-xs text-(--cui-color-text-muted)">{formatUsd(pkg.monthlyUsd)}</span>
        </div>
      </td>
      <td className="px-4 py-3 tabular-nums">
        <div className="flex flex-col">
          <span className="text-(--cui-color-text-default)">{formatUsd(pkg.weeklyUsd)}</span>
          <span className="text-xs text-(--cui-color-text-muted)">
            {pkg.effectiveWeeklyPercent}%
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <Pill tone={pkg.active ? 'success' : 'neutral'}>
          {localize(pkg.active ? 'com_packages_status_active' : 'com_packages_status_archived')}
        </Pill>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <Button type="secondary" label={localize('com_packages_edit')} onClick={onEdit} />
          <Button
            type="secondary"
            label={localize(pkg.active ? 'com_packages_archive' : 'com_packages_restore')}
            disabled={busy}
            onClick={onToggleActive}
          />
        </div>
      </td>
    </tr>
  );
}

export function PackagesPage() {
  const localize = useLocalize();
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const isSuperadmin = user?.isPlatformSuperadmin === true;

  const query = useQuery({
    queryKey: [...PACKAGES_QUERY_KEY, showArchived],
    queryFn: () => listUsagePackagesFn({ data: { includeArchived: showArchived } }),
    enabled: isSuperadmin,
  });

  const toggleActive = useMutation({
    mutationFn: (pkg: t.UsagePackage) =>
      pkg.active
        ? archiveUsagePackageFn({ data: { key: pkg.key } })
        : updateUsagePackageFn({ data: { key: pkg.key, patch: { active: true } } }),
    onSuccess: (_result, pkg) => {
      notifySuccess(
        localize(pkg.active ? 'com_packages_archived' : 'com_packages_restored', {
          name: pkg.name,
        }),
      );
      queryClient.invalidateQueries({ queryKey: PACKAGES_QUERY_KEY });
    },
    onError: (error: Error) => notifyError(error.message),
  });

  const confirmToggle = (pkg: t.UsagePackage) => {
    if (
      pkg.active &&
      !window.confirm(localize('com_packages_archive_confirm', { name: pkg.name }))
    ) {
      return;
    }
    toggleActive.mutate(pkg);
  };

  if (!isSuperadmin) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState message={localize('com_packages_superadmin_only')} />
      </div>
    );
  }
  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState message={query.error?.message || localize('com_packages_load_failed')} />
      </div>
    );
  }

  const { pricing, packages } = query.data;

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-auto p-6">
      <header className="flex flex-col gap-1">
        <h1 className="m-0 text-2xl font-semibold text-(--cui-color-text-default)">
          {localize('com_packages_title')}
        </h1>
        <p className="m-0 max-w-3xl text-sm text-(--cui-color-text-muted)">
          {localize('com_packages_description')}
        </p>
      </header>

      <PricingCard pricing={pricing} />

      <section className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-(--cui-color-text-default)">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(event) => setShowArchived(event.target.checked)}
          />
          {localize('com_packages_show_archived')}
        </label>
        <button
          type="button"
          onClick={() => setDialog({ open: true, pkg: null })}
          className="flex items-center gap-1.5 rounded-lg border border-(--cui-color-stroke-default) px-3 py-2 text-sm text-(--cui-color-text-default) transition-colors hover:bg-(--cui-color-background-hover)"
        >
          <Icon name="plus" size="xs" />
          {localize('com_packages_add')}
        </button>
      </section>

      <section className="overflow-x-auto rounded-lg border border-(--cui-color-stroke-default)">
        {packages.length === 0 ? (
          <EmptyState message={localize('com_packages_empty')} />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-(--cui-color-stroke-default) bg-(--cui-color-background-muted)">
                {HEADERS.map((key) => (
                  <th key={key} className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">
                    {localize(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <PackageRow
                  key={pkg.key}
                  pkg={pkg}
                  busy={toggleActive.isPending}
                  onEdit={() => setDialog({ open: true, pkg })}
                  onToggleActive={() => confirmToggle(pkg)}
                />
              ))}
            </tbody>
          </table>
        )}
      </section>

      {dialog.open ? (
        <PackageDialog
          key={dialog.pkg?.key ?? 'new'}
          open
          pkg={dialog.pkg}
          pricing={pricing}
          onClose={() => setDialog({ open: false })}
        />
      ) : null}
    </div>
  );
}
