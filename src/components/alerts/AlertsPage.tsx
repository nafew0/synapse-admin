import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type * as t from '@/types';
import { checkAlertsFn, listAlertsFn, markAlertsSeenFn } from '@/server';
import { EmptyState, LoadingState } from '@/components/shared';
import { cn, notifyError } from '@/utils';
import { ALERTS_QUERY_KEY } from './keys';
import { useLocalize } from '@/hooks';

const formatDate = (iso: string): string => new Date(iso).toLocaleString();

function AlertItem({
  alert,
  onSeen,
}: {
  alert: t.PlatformAlert;
  onSeen: (alertId: string) => void;
}) {
  const localize = useLocalize();
  const open = alert.status === 'open';
  return (
    <li
      className={cn(
        'flex flex-col gap-1 rounded-lg border border-(--cui-color-stroke-default) p-4',
        !open && 'opacity-60',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase',
            alert.severity === 'critical'
              ? 'synapse-banner-chip-outage'
              : 'synapse-banner-chip-maintenance',
          )}
        >
          {localize(alert.severity === 'critical' ? 'com_alerts_critical' : 'com_alerts_warning')}
        </span>
        <strong className="text-sm text-(--cui-color-title-default)">{alert.title}</strong>
        <span className="ml-auto text-xs text-(--cui-color-text-muted)">
          {open
            ? localize('com_alerts_first_seen', { date: formatDate(alert.firstSeenAt) })
            : localize('com_alerts_resolved_on', {
                date: formatDate(alert.resolvedAt ?? alert.lastSeenAt),
              })}
        </span>
      </div>
      <p className="m-0 text-sm text-(--cui-color-text-muted)">{alert.detail}</p>
      {open && (
        <div className="mt-1">
          {alert.seenAt ? (
            <span className="text-xs text-(--cui-color-text-muted)">
              {localize('com_alerts_seen')}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onSeen(alert._id)}
              className="cursor-pointer rounded-md border border-(--cui-color-stroke-default) bg-transparent px-3 py-1 text-xs font-medium text-(--cui-color-text-default) hover:bg-(--cui-color-background-hover)"
            >
              {localize('com_alerts_mark_seen')}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

/** Every active alert, then recently resolved ones, with a way to run the checks now. */
export function AlertsPage() {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY });

  const { data, isLoading, isError } = useQuery({
    queryKey: ALERTS_QUERY_KEY,
    queryFn: () => listAlertsFn(),
  });

  const seen = useMutation({
    mutationFn: (alertId?: string) => markAlertsSeenFn({ data: { alertId } }),
    onSuccess: refresh,
    onError: (error: Error) => notifyError(error.message),
  });
  const check = useMutation({
    mutationFn: () => checkAlertsFn(),
    onSuccess: (list) => queryClient.setQueryData(ALERTS_QUERY_KEY, list),
    onError: (error: Error) => notifyError(error.message),
  });

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <EmptyState message={localize('com_alerts_load_error')} />;

  const alerts = data.alerts;
  const active = alerts.filter((alert) => alert.status === 'open');
  const resolved = alerts.filter((alert) => alert.status === 'resolved');

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="m-0 flex-1 text-sm text-(--cui-color-text-muted)">
          {localize('com_alerts_desc')}
        </p>
        {data.unseen > 0 && (
          <button
            type="button"
            onClick={() => seen.mutate(undefined)}
            className="cursor-pointer rounded-md border border-(--cui-color-stroke-default) bg-transparent px-3 py-1.5 text-sm"
          >
            {localize('com_alerts_mark_all_seen')}
          </button>
        )}
        <button
          type="button"
          disabled={check.isPending}
          onClick={() => check.mutate()}
          className="cursor-pointer rounded-md border border-(--cui-color-stroke-default) bg-transparent px-3 py-1.5 text-sm disabled:cursor-wait disabled:opacity-60"
        >
          {localize(check.isPending ? 'com_alerts_checking' : 'com_alerts_check_now')}
        </button>
      </div>

      <section aria-label={localize('com_alerts_open')} className="flex flex-col gap-3">
        <h2 className="m-0 text-base font-semibold text-(--cui-color-title-default)">
          {localize('com_alerts_open')}
        </h2>
        {active.length === 0 ? (
          <p className="m-0 text-sm text-(--cui-color-text-muted)">
            {localize('com_alerts_empty')}
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {active.map((alert) => (
              <AlertItem key={alert._id} alert={alert} onSeen={seen.mutate} />
            ))}
          </ul>
        )}
      </section>

      {resolved.length > 0 && (
        <section aria-label={localize('com_alerts_resolved')} className="flex flex-col gap-3">
          <h2 className="m-0 text-base font-semibold text-(--cui-color-title-default)">
            {localize('com_alerts_resolved')}
          </h2>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {resolved.map((alert) => (
              <AlertItem key={alert._id} alert={alert} onSeen={seen.mutate} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
