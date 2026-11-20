import { useState } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import type * as t from '@/types';
import { formatDateTime, notifyError, notifySuccess, USE_FILTERS } from '@/utils';
import { AccessDenied, EmptyState, LoadingState } from '@/components/shared';
import {
  useCostSettings,
  useLocalize,
  useModelPrices,
  usePriceNotices,
  useSyncPrices,
} from '@/hooks';
import { PriceNotices } from './Notices';
import { PriceDrawer } from './Drawer';
import { ModelTable } from './Table';

const STATUSES: t.PriceRowStatus[] = ['changed', 'no_price', 'not_listed', 'ok'];
const WINDOWS = [7, 30, 90] as const;

const selectClass =
  'admin-themed-control h-10 rounded-lg border border-(--cui-color-stroke-default) bg-(--syn-surface) px-2 text-sm text-(--cui-color-text-default)';

function SyncSummary({ list }: { list: t.ModelPriceList }) {
  const localize = useLocalize();
  const { lastSync, lastSuccessfulSync } = list;
  if (!lastSync) return <>{localize('com_prices_never_synced')}</>;
  if (!lastSync.ok) {
    return (
      <>
        {localize('com_prices_sync_failed_at', { date: formatDateTime(lastSync.startedAt) })}
        {lastSuccessfulSync
          ? ` ${localize('com_prices_last_good', { date: formatDateTime(lastSuccessfulSync.startedAt) })}`
          : ''}
      </>
    );
  }
  return (
    <>
      {localize('com_prices_synced', {
        date: formatDateTime(lastSync.startedAt),
        models: lastSync.models,
        changed: lastSync.changed,
      })}
    </>
  );
}

function SyncBar({ list }: { list: t.ModelPriceList }) {
  const localize = useLocalize();
  const sync = useSyncPrices((outcome) => {
    if (outcome.ok) {
      notifySuccess(
        localize('com_prices_sync_done', {
          models: outcome.result.models,
          changed: outcome.result.changed,
        }),
      );
      return;
    }
    if (outcome.reason === 'busy') {
      notifyError(localize('com_prices_sync_busy'));
      return;
    }
    notifyError(
      outcome.message
        ? localize('com_prices_sync_failed_reason', { reason: outcome.message })
        : localize('com_prices_sync_failed'),
    );
  });
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="m-0 text-[13px] text-(--cui-color-text-muted)">
        <SyncSummary list={list} />
      </p>
      <button
        type="button"
        disabled={sync.isPending}
        onClick={() =>
          sync.mutate(undefined, { onError: (error: Error) => notifyError(error.message) })
        }
        className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border-0 bg-(--syn-brand) px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RefreshCw
          aria-hidden="true"
          size={16}
          className={sync.isPending ? 'animate-spin' : undefined}
        />
        {localize(sync.isPending ? 'com_prices_syncing' : 'com_prices_sync_now')}
      </button>
    </div>
  );
}

function Warnings({ warnings }: { warnings: t.ModelPriceList['warnings'] }) {
  const localize = useLocalize();
  const items = [
    warnings.noPrice > 0 && localize('com_prices_warn_no_price', { count: warnings.noPrice }),
    warnings.notListed > 0 && localize('com_prices_warn_not_listed', { count: warnings.notListed }),
    warnings.syncFailingOver24h && localize('com_prices_warn_sync_failing'),
  ].filter((item): item is string => typeof item === 'string');
  if (items.length === 0) return null;
  return (
    <ul
      aria-label={localize('com_prices_warnings')}
      className="m-0 flex list-none flex-col gap-2 p-0"
    >
      {items.map((item) => (
        <li
          key={item}
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-(--syn-danger-border) bg-(--syn-danger-bg) px-4 py-2.5 text-[13px] text-(--syn-danger-fg)"
        >
          <TriangleAlert aria-hidden="true" size={16} className="shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  );
}

interface Filters {
  status: t.PriceRowStatus | '';
  use: string;
  changedDays: number;
}

function FilterBar({ filters, onChange }: { filters: Filters; onChange: (next: Filters) => void }) {
  const localize = useLocalize();
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs text-(--cui-color-text-muted)">
        {localize('com_prices_filter_status')}
        <select
          value={filters.status}
          onChange={(event) =>
            onChange({ ...filters, status: event.target.value as Filters['status'] })
          }
          className={selectClass}
        >
          <option value="">{localize('com_prices_filter_all')}</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {localize(`com_prices_status_${status}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-(--cui-color-text-muted)">
        {localize('com_prices_filter_window')}
        <select
          value={filters.changedDays}
          onChange={(event) => onChange({ ...filters, changedDays: Number(event.target.value) })}
          className={selectClass}
        >
          {WINDOWS.map((days) => (
            <option key={days} value={days}>
              {localize('com_prices_window_days', { count: days })}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-(--cui-color-text-muted)">
        {localize('com_prices_filter_use')}
        <select
          value={filters.use}
          onChange={(event) => onChange({ ...filters, use: event.target.value })}
          className={selectClass}
        >
          <option value="">{localize('com_prices_filter_all')}</option>
          {USE_FILTERS.map((use) => (
            <option key={use} value={use}>
              {localize(`com_prices_use_${use.replace(':', '')}`)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/** Superadmin view of what every model in use costs per million tokens, and when that last changed. */
export function PricesPage() {
  const localize = useLocalize();
  const [filters, setFilters] = useState<Filters>({ status: '', use: '', changedDays: 7 });
  const [modelId, setModelId] = useState<string | null>(null);
  const query = useModelPrices({
    changedDays: filters.changedDays,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.use ? { use: filters.use } : {}),
  });
  const notices = usePriceNotices();
  const settings = useCostSettings();

  if (query.isError && query.error?.message?.toLowerCase().includes('forbidden')) {
    return <AccessDenied />;
  }

  const content = () => {
    if (query.isLoading) return <LoadingState />;
    if (query.isError || !query.data) {
      return <EmptyState message={query.error?.message || localize('com_prices_failed')} />;
    }
    const { data } = query;
    return (
      <>
        <SyncBar list={data} />
        <Warnings warnings={data.warnings} />
        <PriceNotices notices={notices.data ?? []} onView={setModelId} />
        <FilterBar filters={filters} onChange={setFilters} />
        {data.models.length === 0 ? (
          <EmptyState message={localize('com_prices_empty')} />
        ) : (
          <ModelTable
            models={data.models}
            bdtPerUsd={settings.data?.settings.bdtPerUsd ?? null}
            onOpen={setModelId}
          />
        )}
      </>
    );
  };

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <div className="flex w-full flex-col gap-5 p-6 max-sm:p-4">
        <p className="m-0 max-w-3xl text-[13px] text-(--cui-color-text-muted)">
          {localize('com_prices_desc')}
        </p>
        {content()}
      </div>
      <PriceDrawer modelId={modelId} onClose={() => setModelId(null)} />
    </div>
  );
}
