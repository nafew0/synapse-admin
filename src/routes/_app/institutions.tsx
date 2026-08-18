import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router';
import { InstitutionsPage } from '@/components/institutions';

export const Route = createFileRoute('/_app/institutions')({
  component: InstitutionsRoute,
});

function InstitutionsRoute() {
  const isDetailRoute = useRouterState({
    select: (state) =>
      state.matches.some((match) => match.routeId === '/_app/institutions/$tenantId'),
  });

  return isDetailRoute ? <Outlet /> : <InstitutionsPage />;
}
