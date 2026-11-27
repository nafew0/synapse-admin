import { createFileRoute } from '@tanstack/react-router';
import { PackagesPage } from '@/components/packages';

export const Route = createFileRoute('/_app/packages')({ component: PackagesPage });
