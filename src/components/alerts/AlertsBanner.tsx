import { Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type * as t from '@/types';
import { listAlertsFn, markAlertsSeenFn } from '@/server';
import { ALERTS_QUERY_KEY } from './keys';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';

const REFRESH_MS = 5 * 60_000;
const MAX_SHOWN = 2;

const SEVERITY_CLASS: Record<t.AlertSeverity, string> = {
  critical: 'synapse-banner-outage',
  warning: 'synapse-banner-maintenance',
};
const CHIP_CLASS: Record<t.AlertSeverity, string> = {
  critical: 'synapse-banner-chip-outage',
  warning: 'synapse-banner-chip-maintenance',
};
const SEVERITY_KEY: Record<t.AlertSeverity, t.TranslationKeys> = {
  critical: 'com_alerts_critical',
  warning: 'com_alerts_warning',
};

const isUnseen = (alert: t.PlatformAlert): boolean => alert.status === 'open' && !alert.seenAt;

/** Critical first; the API already returns the newest first within a severity. */
const bySeverity = (a: t.PlatformAlert, b: t.PlatformAlert): number =>
  Number(b.severity === 'critical') - Number(a.severity === 'critical');

/**
 * Bars above the header for platform conditions a superadmin has not seen yet: a refused provider key,
 * low credit, a spend spike. Marking one seen hides it until it gets worse or comes back.
 */
export function AlertsBanner() {
  const localize = useLocalize();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ALERTS_QUERY_KEY,
    queryFn: () => listAlertsFn(),
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const { mutate: markSeen } = useMutation({
    mutationFn: (alertId: string) => markAlertsSeenFn({ data: { alertId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY }),
  });

  const unseen = (data?.alerts ?? []).filter(isUnseen).sort(bySeverity);
  if (unseen.length === 0) return null;
  const hidden = unseen.length - MAX_SHOWN;

  return (
    <div role="region" aria-label={localize('com_alerts_banner_label')} className="shrink-0">
      {unseen.slice(0, MAX_SHOWN).map((alert) => (
        <div
          key={alert._id}
          role="alert"
          className={cn(
            'synapse-banner flex min-h-11 items-center gap-3 py-2 pr-2 pl-4 text-sm text-(--cui-color-text-default)',
            SEVERITY_CLASS[alert.severity],
          )}
        >
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[11px] leading-4 font-semibold tracking-wide uppercase',
              CHIP_CLASS[alert.severity],
            )}
          >
            {localize(SEVERITY_KEY[alert.severity])}
          </span>
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <strong className="font-semibold">{alert.title}</strong>
            <span className="text-(--cui-color-text-muted)">{alert.detail}</span>
          </div>
          <button
            type="button"
            onClick={() => markSeen(alert._id)}
            className="shrink-0 cursor-pointer rounded-md border border-(--cui-color-stroke-default) bg-transparent px-3 py-1 text-xs font-medium text-(--cui-color-text-default) hover:bg-(--cui-color-background-hover)"
          >
            {localize('com_alerts_mark_seen')}
          </button>
        </div>
      ))}
      <div className="synapse-banner flex items-center justify-end gap-3 px-4 py-1 text-xs">
        {hidden > 0 && (
          <span className="text-(--cui-color-text-muted)">
            {localize('com_alerts_more', { count: hidden })}
          </span>
        )}
        <Link to="/alerts" className="font-medium underline underline-offset-4">
          {localize('com_alerts_view_all')}
        </Link>
      </div>
    </div>
  );
}
