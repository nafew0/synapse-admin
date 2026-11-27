import { createFileRoute } from '@tanstack/react-router';
import { AlertsPage } from '@/components/alerts';

export const Route = createFileRoute('/_app/alerts')({ component: AlertsPage });
