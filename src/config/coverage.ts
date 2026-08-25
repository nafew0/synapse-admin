import { configSchema } from 'librechat-data-provider';

export type ConfigDisposition =
  | { kind: 'editable'; tab: string; sectionId: string; renderer?: string; warning?: string }
  | { kind: 'read-only'; tab: string; sectionId: string; reason: string }
  | { kind: 'hidden'; reason: string };

const dispositions: Record<string, ConfigDisposition> = {
  version: { kind: 'read-only', tab: 'system', sectionId: 'version', reason: 'Compatibility metadata is managed by the server.' },
  cache: { kind: 'editable', tab: 'system', sectionId: 'cache', warning: 'A backend restart is required after changing this setting.' },
  modelSpecs: { kind: 'editable', tab: 'specs', sectionId: 'modelSpecs', renderer: 'modelSpecs' },
  endpoints: { kind: 'editable', tab: 'providers', sectionId: 'endpoints', renderer: 'endpoints' },
  mcpServers: { kind: 'editable', tab: 'mcp', sectionId: 'mcpServers', renderer: 'mcpServers' },
  mcpSettings: { kind: 'editable', tab: 'mcp', sectionId: 'mcpSettings' },
  interface: { kind: 'editable', tab: 'features', sectionId: 'interface' },
  turnstile: { kind: 'editable', tab: 'features', sectionId: 'turnstile' },
  actions: { kind: 'editable', tab: 'features', sectionId: 'actions' },
  messageFilter: { kind: 'editable', tab: 'features', sectionId: 'messageFilter' },
  registration: { kind: 'editable', tab: 'features', sectionId: 'registration' },
  includedTools: { kind: 'editable', tab: 'features', sectionId: 'includedTools' },
  filteredTools: { kind: 'editable', tab: 'features', sectionId: 'filteredTools' },
  skillSync: { kind: 'editable', tab: 'features', sectionId: 'skillSync' },
  memory: { kind: 'editable', tab: 'features', sectionId: 'memory' },
  summarization: { kind: 'editable', tab: 'features', sectionId: 'summarization' },
  speech: { kind: 'editable', tab: 'features', sectionId: 'speech' },
  ocr: { kind: 'editable', tab: 'features', sectionId: 'ocr' },
  webSearch: { kind: 'editable', tab: 'features', sectionId: 'webSearch' },
  rateLimits: { kind: 'editable', tab: 'system', sectionId: 'rateLimits' },
  balance: { kind: 'editable', tab: 'system', sectionId: 'balance' },
  transactions: { kind: 'editable', tab: 'system', sectionId: 'transactions' },
  fileStrategy: { kind: 'editable', tab: 'files', sectionId: 'fileStrategy' },
  fileStrategies: { kind: 'editable', tab: 'files', sectionId: 'fileStrategies' },
  fileConfig: { kind: 'editable', tab: 'files', sectionId: 'fileConfig' },
  cloudfront: { kind: 'editable', tab: 'files', sectionId: 'cloudfront' },
  secureImageLinks: { kind: 'editable', tab: 'files', sectionId: 'secureImageLinks' },
  imageOutputType: { kind: 'editable', tab: 'files', sectionId: 'imageOutputType' },
};

export function getConfigDisposition(key: string): ConfigDisposition | undefined {
  return dispositions[key];
}

export function getConfigCoverage(): Record<string, ConfigDisposition> {
  return { ...dispositions };
}

export function getConfigSchemaKeys(): string[] {
  return Object.keys((configSchema as unknown as { shape: Record<string, unknown> }).shape);
}

export function getUnclassifiedConfigKeys(): string[] {
  return getConfigSchemaKeys().filter((key) => !dispositions[key]);
}
