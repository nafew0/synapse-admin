import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router';
import { UsersPage } from '@/components/users';

export const Route = createFileRoute('/_app/users')({
  component: UsersRoute,
});

function UsersRoute() {
  const isDetailRoute = useRouterState({
    select: (state) =>
      state.matches.some((match) => match.routeId === '/_app/users/$userId'),
  });

  return isDetailRoute ? <Outlet /> : <UsersPage />;
}
