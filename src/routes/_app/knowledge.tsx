import { createFileRoute } from '@tanstack/react-router';
import { KnowledgeBase } from '@/components/knowledge';

export const Route = createFileRoute('/_app/knowledge')({
  component: KnowledgeBase,
});
