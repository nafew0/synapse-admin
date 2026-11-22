import { createFileRoute } from '@tanstack/react-router';
import { IndividualsPage } from '@/components/individuals';

export const Route = createFileRoute('/_app/individuals')({ component: IndividualsPage });
