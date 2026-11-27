import { createFileRoute } from '@tanstack/react-router';
import { PricesPage } from '@/components/prices';

export const Route = createFileRoute('/_app/prices')({ component: PricesPage });
