import { createFileRoute } from '@tanstack/react-router';
import { CostsPage } from '@/components/costs';

export const Route = createFileRoute('/_app/costs')({ component: CostsPage });
