import { useState } from 'react';
import { getRouteApi } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type * as t from '@/types';
import {
  getPlatformInstitutionQuotaFn,
  listPlatformInstitutionPoliciesFn,
  getPlatformInstitutionQuotaReadinessFn,
} from '@/server';
import { History, PolicyEditor, Usage } from '@/components/institutions/InstitutionDetailPage';
import { EmptyState, LoadingState } from '@/components/shared';
import { TrialPackageCard } from '@/components/packages';
import { cn, INDIVIDUAL_ACCOUNT } from '@/utils';
import { useLocalize } from '@/hooks';

const AppRoute = getRouteApi('/_app');

type Tab = 'usage' | 'policy' | 'history';

const TAB_KEYS: Record<Tab, t.TranslationKeys> = {
  usage: 'com_individuals_tab_usage',
  policy: 'com_individuals_tab_policy',
  history: 'com_individuals_tab_history',
};

const tenantId = INDIVIDUAL_ACCOUNT;

/** People outside any institution: their trial package, their usage, and when limits are enforced. */
export function IndividualsPage() {
  const localize = useLocalize();
  const { user } = AppRoute.useRouteContext();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('usage');
  const quotaQuery = useQuery({
    queryKey: ['platformInstitutionQuota', tenantId],
    queryFn: () => getPlatformInstitutionQuotaFn({ data: { tenantId } }),
  });
  const readinessQuery = useQuery({
    queryKey: ['platformInstitutionQuotaReadiness', tenantId],
    queryFn: () => getPlatformInstitutionQuotaReadinessFn({ data: { tenantId } }),
    enabled: tab === 'usage',
  });
  const historyQuery = useQuery({
    queryKey: ['platformInstitutionPolicies', tenantId],
    queryFn: () => listPlatformInstitutionPoliciesFn({ data: { tenantId } }),
    enabled: tab === 'history',
  });

  if (!user?.isPlatformSuperadmin) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState message={localize('com_individuals_superadmin_only')} />
      </div>
    );
  }
  if (quotaQuery.isLoading) return <LoadingState />;
  if (quotaQuery.isError || !quotaQuery.data) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState message={quotaQuery.error?.message || localize('com_individuals_load_failed')} />
      </div>
    );
  }

  const quota = quotaQuery.data;
  return (
    <div className="flex flex-1 flex-col gap-5 overflow-auto p-6">
      <header>
        <h1 className="text-2xl font-semibold text-(--cui-color-text-default)">
          {localize('com_individuals_title')}
        </h1>
        <p className="text-sm text-(--cui-color-text-muted)">
          {localize('com_individuals_description')}
        </p>
      </header>

      <TrialPackageCard current={quota.usagePackage?.memberPackageKey ?? null} />

      <nav className="flex flex-wrap gap-2 border-b border-(--cui-color-stroke-default) pb-3">
        {(Object.keys(TAB_KEYS) as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            aria-pressed={tab === item}
            className={cn(
              'rounded-lg px-3 py-2 text-sm',
              tab === item
                ? 'bg-(--cui-color-background-accent) text-(--cui-color-text-default)'
                : 'text-(--cui-color-text-muted) hover:bg-(--cui-color-background-hover)',
            )}
          >
            {localize(TAB_KEYS[item])}
          </button>
        ))}
      </nav>

      {tab === 'usage' && (
        <Usage
          policy={quota.policy}
          health={quota.health}
          models={quota.models}
          credits={quota.credits}
          readiness={readinessQuery.data}
          readinessError={readinessQuery.isError}
        />
      )}
      {tab === 'policy' && (
        <PolicyEditor
          key={`${tenantId}:${quota.policy.version}`}
          tenantId={tenantId}
          policy={quota.policy}
          models={quota.models}
          creditOnly
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['platformInstitutionQuota', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['platformInstitutionPolicies', tenantId] });
          }}
        />
      )}
      {tab === 'history' &&
        (historyQuery.isError ? (
          <EmptyState message={historyQuery.error?.message || localize('com_individuals_load_failed')} />
        ) : (
          <History policies={historyQuery.data?.policies ?? []} />
        ))}
    </div>
  );
}
