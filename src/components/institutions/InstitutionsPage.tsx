import { useState } from 'react';
import { Button } from '@clickhouse/click-ui';
import { Link, getRouteApi } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import type * as t from '@/types';
import { listPlatformInstitutionsFn } from '@/server';
import { BdrenNote, EmptyState, LoadingState, SearchInput } from '@/components/shared';

const Route = getRouteApi('/_app');

export function InstitutionsPage() {
  const { user } = Route.useRouteContext();
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);

  const institutionsQuery = useQuery({
    queryKey: ['platformInstitutions', search, offset],
    queryFn: () =>
      listPlatformInstitutionsFn({
        data: { q: search.trim() || undefined, limit: 25, offset },
      }),
  });

  const filtered = institutionsQuery.data?.institutions ?? [];

  if (!user?.isPlatformSuperadmin) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState message="Platform superadmin access is required for institution management." />
      </div>
    );
  }

  if (institutionsQuery.isLoading) {
    return <LoadingState />;
  }

  if (institutionsQuery.isError) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState message={institutionsQuery.error.message || 'Failed to load institutions.'} />
      </div>
    );
  }

  const institutions = institutionsQuery.data?.institutions ?? [];

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-auto p-6">
      <BdrenNote />

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SummaryCard label="Institutions" value={String(institutionsQuery.data?.total ?? 0)} />
        <SummaryCard
          label="Active institutions"
          value={String(
            institutions.filter((institution) => institution.status === 'active').length,
          )}
        />
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setOffset(0);
          }}
          placeholder="Search institutions"
          className="min-w-70 flex-1"
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-(--cui-color-stroke-default)">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-(--cui-color-stroke-default) bg-(--cui-color-background-muted)">
              <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">Institution</th>
              <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">Tenant ID</th>
              <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">Members</th>
              <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">Status</th>
              <th className="px-4 py-2.5 font-medium text-(--cui-color-text-muted)">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState message="No institutions match the current filter." />
                </td>
              </tr>
            ) : (
              filtered.map((institution, index) => (
                <tr
                  key={institution._id || institution.id || institution.tenantId}
                  className={
                    index < filtered.length - 1
                      ? 'border-b border-(--cui-color-stroke-default)'
                      : undefined
                  }
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-(--cui-color-text-default)">
                        {institution.name}
                      </span>
                      <span className="text-xs text-(--cui-color-text-muted)">
                        {institution.slug || 'No slug configured'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-(--cui-color-text-default)">
                    {institution.tenantId}
                  </td>
                  <td className="px-4 py-3 text-(--cui-color-text-default)">
                    {institution.stats?.activeMembers ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={institution.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        to="/institutions/$tenantId"
                        params={{ tenantId: institution.tenantId }}
                        className="rounded-lg border border-(--cui-color-stroke-default) px-3 py-2 text-xs text-(--cui-color-text-default) hover:bg-(--cui-color-background-hover)"
                      >
                        Open
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="secondary"
          label="Previous"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(offset - 25, 0))}
        />
        <span className="text-xs text-(--cui-color-text-muted)">
          {offset + 1}–{Math.min(offset + institutions.length, institutionsQuery.data?.total ?? 0)}{' '}
          of {institutionsQuery.data?.total ?? 0}
        </span>
        <Button
          type="secondary"
          label="Next"
          disabled={offset + institutions.length >= (institutionsQuery.data?.total ?? 0)}
          onClick={() => setOffset(offset + 25)}
        />
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: t.PlatformInstitution['status'] }) {
  const suspended = status === 'suspended';
  const closed = status === 'closed';
  return (
    <span
      className={
        closed
          ? 'rounded-full bg-(--cui-color-background-muted) px-2 py-0.5 text-xs text-(--cui-color-text-muted)'
          : suspended
            ? 'rounded-full bg-(--syn-warning-bg) px-2 py-0.5 text-xs text-(--syn-warning-fg)'
            : 'rounded-full bg-(--syn-success-bg) px-2 py-0.5 text-xs text-(--syn-success-fg)'
      }
    >
      {status}
    </span>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-panel) p-4">
      <p className="text-xs text-(--cui-color-text-muted)">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-(--cui-color-text-default)">{value}</p>
    </div>
  );
}
