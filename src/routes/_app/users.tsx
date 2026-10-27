import { createFileRoute, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { UsersPage } from '@/components/users';

interface UsersSearch {
  invite?: boolean;
}

export const Route = createFileRoute('/_app/users')({
  validateSearch: (search: Record<string, unknown>): UsersSearch => ({
    invite: search.invite === true || search.invite === '1' || search.invite === 'true' ? true : undefined,
  }),
  component: UsersRoute,
});

function UsersRoute() {
  const { invite } = Route.useSearch();
  const navigate = useNavigate({ from: '/users' });
  const isDetailRoute = useRouterState({
    select: (state) =>
      state.matches.some((match) => match.routeId === '/_app/users/$userId'),
  });

  if (isDetailRoute) {
    return <Outlet />;
  }
  return (
    <UsersPage
      openInvite={invite === true}
      onInviteHandled={() => navigate({ search: {}, replace: true })}
    />
  );
}
