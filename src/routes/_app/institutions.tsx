import { createFileRoute } from '@tanstack/react-router';
import { InstitutionsPage } from '@/components/institutions';

export const Route = createFileRoute('/_app/institutions')({
  component: InstitutionsPage,
});
