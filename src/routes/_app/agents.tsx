import { createFileRoute } from '@tanstack/react-router';
import { AgentsCatalogPage } from '@/components/agents/AgentsCatalogPage';

export const Route = createFileRoute('/_app/agents')({ component: AgentsCatalogPage });
