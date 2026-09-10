export interface UsageRange {
  start: string;
  end: string;
}

/** `totalCost` is omitted by the API for institution admins, who are never
 *  shown spend; the field is absent from the payload, not zeroed. */
export interface UsageSummary {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalCost?: number;
  eventCount: number;
  memberCount: number;
  modelCount: number;
}

export interface MemberUsageRow {
  userId: string;
  name: string;
  email?: string;
  role?: string;
  membershipStatus?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalCost?: number;
  eventCount: number;
  lastUsedAt?: string;
}

export interface ModelUsageRow {
  /** The label the chat UI shows for this model; absent only when no model spec
   *  claims it, which institution admins never see. */
  displayName?: string;
  providerKey?: string;
  modelKey: string;
  providerModelId?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalCost?: number;
  eventCount: number;
  memberCount: number;
  lastUsedAt?: string;
}

export interface UsageTimeseriesPoint {
  day: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalCost: number;
  eventCount: number;
}

export interface UserUsageResponse {
  range: UsageRange & { timezone?: string };
  summary: Omit<UsageSummary, 'memberCount' | 'modelCount'> & { lastUsedAt?: string | null };
  models: Array<Omit<ModelUsageRow, 'memberCount'>>;
}
