export interface PriceTier {
  minPromptTokens: number;
  prompt: number;
  completion: number;
  cacheRead?: number;
  cacheWrite?: number;
  cacheWrite1h?: number;
}

/** USD per 1M tokens; `webSearch` is USD per call. */
export interface PriceBlock {
  prompt: number;
  completion: number;
  cacheRead?: number;
  cacheWrite?: number;
  cacheWrite1h?: number;
  reasoning?: number;
  image?: number;
  imageOutput?: number;
  audio?: number;
  audioOutput?: number;
  webSearch?: number;
  contextLength?: number;
  tiers: PriceTier[];
}

export type PriceSource = 'openrouter' | 'manual';
export type PriceRowStatus = 'ok' | 'changed' | 'not_listed' | 'no_price';
export type PriceVersionSource = 'sync' | 'sync_now' | 'override_set' | 'override_cleared';
export type PriceChangeKind = 'price_changed' | 'unpriced' | 'not_listed' | 'sync_failing';
export type PriceDiffKind = 'changed' | 'added' | 'removed' | 'unchanged';

export interface PriceDiffLine {
  /** `prompt`, `cacheRead`, or `tier:<minPromptTokens>:<field>`. */
  field: string;
  previous: number | null;
  current: number | null;
  change: number | null;
  changePct: number | null;
  kind: PriceDiffKind;
}

export interface PriceOverrideInfo {
  reason: string;
  setBy: string | null;
  setByName?: string | null;
  setAt: string;
  until: string | null;
}

export interface ModelPriceRow {
  modelId: string;
  name: string;
  kind: 'chat' | 'embedding';
  usedFor: string[];
  status: PriceRowStatus;
  source: PriceSource | null;
  price: PriceBlock | null;
  syncedPrice: PriceBlock | null;
  override: PriceOverrideInfo | null;
  longPrompt: string | null;
  contextLength: number | null;
  fetchedAt: string | null;
  lastChangedAt: string | null;
  version: number;
  unpricedHits: number;
}

export interface PriceSyncRun {
  trigger: 'startup' | 'timer' | 'manual';
  startedAt: string;
  finishedAt?: string;
  ok: boolean;
  models: number;
  changed: number;
  notListed: number;
  unpriced: number;
  error?: string;
  actor?: string;
}

export interface ModelPriceList {
  lastSync: PriceSyncRun | null;
  lastSuccessfulSync: PriceSyncRun | null;
  warnings: { noPrice: number; notListed: number; syncFailingOver24h: boolean };
  unseenNotices: number;
  models: ModelPriceRow[];
}

export interface ModelPriceListFilter {
  status?: PriceRowStatus;
  use?: string;
  changedDays?: number;
}

export interface PriceNotice {
  _id: string;
  modelId: string;
  kind: PriceChangeKind;
  version?: number;
  summary: string;
  diff: PriceDiffLine[];
  seenAt?: string | null;
  seenBy?: string;
  createdAt: string;
}

export interface PriceVersion {
  modelId: string;
  version: number;
  effectiveFrom: string;
  source: PriceVersionSource;
  priceSource: PriceSource;
  price: PriceBlock;
  previous?: PriceBlock | null;
  diff: PriceDiffLine[];
  actor?: string;
  actorName?: string | null;
  note?: string;
}

export interface PriceCostEffect {
  windowDays: number;
  calls: number;
  truncated: boolean;
  recordedUsd: number;
  atPreviousUsd: number | null;
  atCurrentUsd: number;
  differenceUsd: number | null;
}

export interface ModelPriceDetail {
  model: ModelPriceRow;
  lastChange: PriceDiffLine[];
  biggestChangePct: number | null;
  versions: PriceVersion[];
  costEffect: PriceCostEffect | null;
}

export interface PriceDiffResponse {
  modelId: string;
  from: number;
  to: number;
  diff: PriceDiffLine[];
}

export interface PriceOverrideInput {
  modelId: string;
  price: PriceBlock;
  reason: string;
  until?: string | null;
}

export interface PriceSyncResult {
  ok: boolean;
  models: number;
  changed: number;
  created?: number;
  notListed: number;
}

export type PriceSyncOutcome =
  | { ok: true; result: PriceSyncResult }
  | { ok: false; reason: 'failed' | 'busy'; message: string };
