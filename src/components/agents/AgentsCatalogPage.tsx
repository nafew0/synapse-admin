import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { applyAgentsCatalogFn, getAgentsCatalogFn, getOfficeAgentsManifestFn, previewAgentsCatalogFn, updateAgentCatalogFn } from '@/server';
import { EmptyState, LoadingState } from '@/components/shared';
import { notifyError, notifySuccess } from '@/utils';

type CatalogAgent = {
  id: string;
  name: string;
  description?: string | null;
  instructions?: string | null;
  provider?: string;
  model?: string | null;
  model_parameters?: Record<string, unknown>;
  tools?: string[];
  capabilities?: string[];
  skills?: string[];
  skills_enabled?: boolean;
  subagents?: Record<string, unknown>;
  tool_options?: Record<string, unknown>;
  tool_resources?: Record<string, unknown>;
  published?: boolean;
  directSelection?: boolean;
  orchestrationOnly?: boolean;
  displayOrder?: number;
  icon?: string;
  edges?: Array<{ to: string }>;
};

function AgentEditor({ agent, onClose }: { agent: CatalogAgent; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: agent.name,
    description: agent.description ?? '',
    instructions: agent.instructions ?? '',
    provider: agent.provider ?? '',
    model: agent.model ?? '',
    model_parameters: JSON.stringify(agent.model_parameters ?? {}, null, 2),
    tools: (agent.tools ?? []).join(', '),
    capabilities: (agent.capabilities ?? []).join(', '),
    skills: (agent.skills ?? []).join(', '),
    skills_enabled: agent.skills_enabled === true,
    subagents: JSON.stringify(agent.subagents ?? {}, null, 2),
    tool_options: JSON.stringify(agent.tool_options ?? {}, null, 2),
    tool_resources: JSON.stringify(agent.tool_resources ?? {}, null, 2),
    displayOrder: String(agent.displayOrder ?? 0),
    icon: agent.icon ?? '',
    published: agent.published === true,
    directSelection: agent.directSelection !== false,
  });
  const [error, setError] = useState('');
  const mutation = useMutation({
    mutationFn: () => {
      let model_parameters: Record<string, unknown>;
      try {
        model_parameters = JSON.parse(form.model_parameters || '{}');
      } catch {
        throw new Error('Model parameters must be valid JSON');
      }
      return updateAgentCatalogFn({
        data: {
          id: agent.id,
          patch: {
            name: form.name.trim(),
            description: form.description,
            instructions: form.instructions,
            provider: form.provider.trim(),
            model: form.model.trim(),
            model_parameters,
            tools: form.tools.split(',').map((value) => value.trim()).filter(Boolean),
            capabilities: form.capabilities.split(',').map((value) => value.trim()).filter(Boolean),
            skills: form.skills.split(',').map((value) => value.trim()).filter(Boolean),
            skills_enabled: form.skills_enabled,
            subagents: JSON.parse(form.subagents || '{}'),
            tool_options: JSON.parse(form.tool_options || '{}'),
            tool_resources: JSON.parse(form.tool_resources || '{}'),
            displayOrder: Math.max(0, Number.parseInt(form.displayOrder, 10) || 0),
            icon: form.icon.trim() || undefined,
            published: form.published,
            directSelection: form.directSelection,
          },
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents-catalog'] });
      notifySuccess('Agent saved');
      onClose();
    },
    onError: (err: Error) => { setError(err.message); notifyError(err.message); },
  });

  const set = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  return (
    <div className="mt-4 rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) p-4">
      <div className="grid gap-3 md:grid-cols-2">
        {(['name', 'provider', 'model', 'displayOrder', 'icon'] as const).map((key) => (
          <label key={key} className="flex flex-col gap-1 text-sm text-(--cui-color-text-default)">
            <span className="font-medium">{key === 'displayOrder' ? 'Display order' : key[0].toUpperCase() + key.slice(1)}</span>
            <input value={form[key]} onChange={(event) => set(key, event.target.value)} className="rounded-md border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-2 py-1.5" />
          </label>
        ))}
      </div>
      {(['description', 'instructions'] as const).map((key) => (
        <label key={key} className="mt-3 flex flex-col gap-1 text-sm text-(--cui-color-text-default)">
          <span className="font-medium">{key[0].toUpperCase() + key.slice(1)}</span>
          <textarea rows={key === 'instructions' ? 8 : 3} value={form[key]} onChange={(event) => set(key, event.target.value)} className="rounded-md border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-2 py-1.5" />
        </label>
      ))}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {(['tools', 'capabilities', 'skills'] as const).map((key) => (
          <label key={key} className="flex flex-col gap-1 text-sm text-(--cui-color-text-default)">
            <span className="font-medium">{key[0].toUpperCase() + key.slice(1)} (comma separated)</span>
            <input value={form[key]} onChange={(event) => set(key, event.target.value)} className="rounded-md border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-2 py-1.5" />
          </label>
        ))}
      </div>
      <label className="mt-3 flex flex-col gap-1 text-sm text-(--cui-color-text-default)">
        <span className="font-medium">Model parameters (JSON)</span>
        <textarea rows={5} value={form.model_parameters} onChange={(event) => set('model_parameters', event.target.value)} className="font-mono rounded-md border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-2 py-1.5" />
      </label>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {(['subagents', 'tool_options', 'tool_resources'] as const).map((key) => (
          <label key={key} className="flex flex-col gap-1 text-sm text-(--cui-color-text-default)">
            <span className="font-medium">{key.replace('_', ' ')} (JSON)</span>
            <textarea rows={4} value={form[key]} onChange={(event) => set(key, event.target.value)} className="font-mono rounded-md border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-2 py-1.5" />
          </label>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-sm text-(--cui-color-text-default)">
        <label><input type="checkbox" checked={form.published} onChange={(event) => set('published', event.target.checked)} /> <span className="ml-1">Published to Model Selector</span></label>
        <label><input type="checkbox" checked={form.directSelection} onChange={(event) => set('directSelection', event.target.checked)} /> <span className="ml-1">Directly selectable</span></label>
        <label><input type="checkbox" checked={form.skills_enabled} onChange={(event) => set('skills_enabled', event.target.checked)} /> <span className="ml-1">Skills enabled</span></label>
      </div>
      {error ? <p className="mt-3 text-sm text-(--cui-color-text-danger)">{error}</p> : null}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-md border border-(--cui-color-stroke-default) px-3 py-1.5 text-sm">Cancel</button>
        <button type="button" onClick={() => { setError(''); mutation.mutate(); }} disabled={mutation.isPending || !form.name.trim() || !form.provider.trim() || !form.model.trim()} className="rounded-md bg-(--cui-color-background-active) px-3 py-1.5 text-sm font-medium text-(--cui-color-text-default) disabled:opacity-50">{mutation.isPending ? 'Saving…' : 'Save agent'}</button>
      </div>
    </div>
  );
}

export function AgentsCatalogPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['agents-catalog'], queryFn: getAgentsCatalogFn });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [manifestText, setManifestText] = useState('');
  const [manifestPreview, setManifestPreview] = useState<{ operations?: Array<{ id: string; operation: string; changedFields: string[] }>; valid?: boolean } | null>(null);
  const previewMutation = useMutation({
    mutationFn: () => previewAgentsCatalogFn({ data: JSON.parse(manifestText) }),
    onSuccess: (result) => setManifestPreview(result as typeof manifestPreview),
    onError: (error: Error) => notifyError(error.message),
  });
  const applyManifestMutation = useMutation({
    mutationFn: () => applyAgentsCatalogFn({ data: JSON.parse(manifestText) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['agents-catalog'] }); setManifestPreview(null); notifySuccess('Manifest applied'); },
    onError: (error: Error) => notifyError(error.message),
  });
  const officeSync = useMutation({
    mutationFn: async () => {
      const manifest = await getOfficeAgentsManifestFn();
      return applyAgentsCatalogFn({ data: manifest as { master: Record<string, unknown>; specialists: Array<Record<string, unknown>> } });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['agents-catalog'] }); notifySuccess('Office agents synchronized'); },
    onError: (error: Error) => notifyError(error.message),
  });
  const agents = useMemo(() => ((query.data as { agents?: CatalogAgent[] })?.agents ?? []).slice().sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name)), [query.data]);
  if (query.isLoading) return <LoadingState />;
  if (query.isError) return <EmptyState message={query.error.message} />;
  if (agents.length === 0) return <EmptyState message="No agents are registered in the global catalog." />;

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-auto p-6">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h1 className="text-2xl font-semibold text-(--cui-color-text-default)">Agents catalog</h1>
            <p className="mt-1 text-sm text-(--cui-color-text-muted)">Global agent configuration is restricted to platform Superadmins. Changes invalidate the runtime catalog.</p></div>
          <button type="button" onClick={() => { if (window.confirm('Synchronize the checked-in phase-one office-agent manifest?')) officeSync.mutate(); }} disabled={officeSync.isPending} className="rounded-md bg-(--cui-color-background-active) px-3 py-1.5 text-sm font-medium text-(--cui-color-text-default) disabled:opacity-50">{officeSync.isPending ? 'Synchronizing…' : 'Sync office agents'}</button>
        </div>
      </header>
      <details className="rounded-lg border border-(--cui-color-stroke-default) p-4">
        <summary className="cursor-pointer text-sm font-medium text-(--cui-color-text-default)">Import agent manifest (JSON)</summary>
        <p className="mt-2 text-xs text-(--cui-color-text-muted)">Paste the validated manifest shape from YAML conversion. Preview never mutates the catalog.</p>
        <textarea value={manifestText} onChange={(event) => setManifestText(event.target.value)} rows={6} placeholder={'{"master": { ... }, "specialists": []}'} className="mt-3 w-full font-mono text-xs rounded-md border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-2 py-1.5" />
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={!manifestText.trim() || previewMutation.isPending} onClick={() => previewMutation.mutate()} className="rounded-md border border-(--cui-color-stroke-default) px-3 py-1.5 text-sm disabled:opacity-50">{previewMutation.isPending ? 'Previewing…' : 'Preview'}</button>
          <button type="button" disabled={!manifestPreview?.valid || applyManifestMutation.isPending} onClick={() => { if (window.confirm('Apply this manifest to the global catalog?')) applyManifestMutation.mutate(); }} className="rounded-md bg-(--cui-color-background-active) px-3 py-1.5 text-sm disabled:opacity-50">{applyManifestMutation.isPending ? 'Applying…' : 'Apply preview'}</button>
        </div>
        {manifestPreview ? <div className="mt-3 text-xs text-(--cui-color-text-muted)"><p>{manifestPreview.valid ? 'Valid manifest' : 'Manifest rejected'}</p>{manifestPreview.operations?.map((operation) => <p key={operation.id}>{operation.id}: {operation.operation}{operation.changedFields.length ? ` (${operation.changedFields.join(', ')})` : ''}</p>)}</div> : null}
      </details>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <article key={agent.id} className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-panel) p-4">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="font-semibold text-(--cui-color-text-default)">{agent.name}</h2><p className="text-xs text-(--cui-color-text-muted)">{agent.id}</p></div>
              <span className="rounded-full bg-(--cui-color-background-secondary) px-2 py-1 text-xs">{agent.published ? 'Published' : 'Draft'}</span>
            </div>
            <p className="mt-3 line-clamp-3 text-sm text-(--cui-color-text-muted)">{agent.description || 'No description'}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><dt className="text-(--cui-color-text-muted)">Model</dt><dd>{agent.provider || '—'} / {agent.model || '—'}</dd></div><div><dt className="text-(--cui-color-text-muted)">Direct selection</dt><dd>{agent.directSelection ? 'Enabled' : 'Disabled'}</dd></div></dl>
            {agent.edges?.length ? <p className="mt-3 text-xs text-(--cui-color-text-muted)">Delegates to {agent.edges.length} agent(s)</p> : null}
            <button type="button" onClick={() => setEditingId(editingId === agent.id ? null : agent.id)} className="mt-4 rounded-md border border-(--cui-color-stroke-default) px-3 py-1.5 text-sm text-(--cui-color-text-default)">{editingId === agent.id ? 'Close editor' : 'Edit configuration'}</button>
            {editingId === agent.id ? <AgentEditor agent={agent} onClose={() => setEditingId(null)} /> : null}
          </article>
        ))}
      </div>
    </div>
  );
}
