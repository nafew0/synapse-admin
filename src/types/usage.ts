export interface UsageRange {
  start: string;
  end: string;
}

export interface UsageSummary {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalCost: number;
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
  totalCost: number;
  eventCount: number;
  lastUsedAt?: string;
}

export interface ModelUsageRow {
  providerKey?: string;
  modelKey: string;
  providerModelId?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalCost: number;
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
