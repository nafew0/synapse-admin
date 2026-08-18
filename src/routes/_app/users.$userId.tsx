import { createFileRoute } from '@tanstack/react-router';
import { UserDetailPage } from '@/components/users';

export const Route = createFileRoute('/_app/users/$userId')({
  component: UserDetailPage,
});
