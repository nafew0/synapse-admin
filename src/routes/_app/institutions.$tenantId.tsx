import { createFileRoute } from '@tanstack/react-router';
import { InstitutionDetailPage } from '@/components/institutions';

export const Route = createFileRoute('/_app/institutions/$tenantId')({
  component: InstitutionDetailPage,
});
