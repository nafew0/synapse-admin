export interface CostRange {
  start: string;
  end: string;
  days: number;
  timezone: string;
  bdtPerUsd: number;
  providerFeePercent: number;
}

/** Every money object from `/api/platform/costs/*`. OCR and the other services are already inside `costUsd`. */
export interface CostFigures {
  ledgerUsd: number;
  feeUsd: number;
  costUsd: number;
  costBdt: number;
  billableUsd: number;
  platformUsd: number;
  requests: number;
  units: number;
  pages: number;
  inputTokens: number;
  outputTokens: number;
}

export type CostByService = Record<string, number>;

export interface CostPeriod {
  cost: CostFigures;
  byService: CostByService;
  activeUsers: number;
  costPerActiveUser: number | null;
}

export interface FixedCostItem {
  id?: string;
  label: string;
  amount: number;
  currency: 'USD' | 'BDT';
}

export interface FixedCostLine extends FixedCostItem {
  monthlyUsd: number;
  periodUsd: number;
}

export interface CostSummary {
  range: CostRange;
  current: CostPeriod;
  previous: CostPeriod & { range: Pick<CostRange, 'start' | 'end' | 'days'> };
  change: {
    costUsd: number | null;
    activeUsers: number | null;
    costPerActiveUser: number | null;
  };
  fixed: { items: FixedCostLine[]; periodUsd: number; periodBdt: number };
  grandTotal: { usd: number; bdt: number };
}

export type CostTenantKind = 'institution' | 'individuals' | 'platform' | 'unknown';

export interface CostInstitutionRow {
  tenantId: string;
  name: string;
  kind: CostTenantKind;
  cost: CostFigures;
  byService: CostByService;
  activeMembers: number;
  costPerActiveMember: number | null;
  topModel: string | null;
  previousCostUsd: number;
  changeVsPrevious: number | null;
  shareOfTotal: number;
}

export interface CostInstitutionsResponse {
  range: CostRange;
  institutions: CostInstitutionRow[];
}

export interface CostServiceRow extends CostFigures {
  service: string;
  topInstitutions: Array<{ tenantId: string; name: string; costUsd: number; units: number }>;
}

export interface CostServicesResponse {
  range: CostRange;
  services: CostServiceRow[];
}

export type CostGroupBy = 'service' | 'institution';

export interface CostSeries {
  key: string;
  label: string;
  values: number[];
  totalUsd: number;
}

export interface CostTimeseriesResponse {
  range: CostRange;
  groupBy: CostGroupBy;
  days: string[];
  series: CostSeries[];
}

export interface CostMemberRow extends CostFigures {
  user: string | null;
  name: string | null;
  email: string | null;
  tenantId: string;
  byService: CostByService;
}

export interface CostInstitutionDetail {
  range: CostRange;
  tenantId: string;
  name: string;
  cost: CostFigures;
  activeMembers: number;
  byService: CostByService;
  byModel: Array<CostFigures & { service: string; model: string | null }>;
  byMember: CostMemberRow[];
  byDay: Array<CostFigures & { day: string }>;
}

export interface CostRequestRow {
  id: string;
  createdAt: string;
  user: string;
  tenantId: string | null;
  conversationId: string | null;
  messageId: string | null;
  service: string | null;
  model: string | null;
  usageKind: string | null;
  taskType: string | null;
  billable: boolean;
  tokenType: string | null;
  units: number;
  pages: number;
  /** Raw ledger rate, without the top-up fee. */
  ledgerUsd: number;
}

export interface CostRequestsResponse {
  range: CostRange;
  requests: CostRequestRow[];
  next: string | null;
}

export interface CostSettings {
  bdtPerUsd: number;
  providerFeePercent: number;
  configured: boolean;
  fixedCosts: FixedCostItem[];
  updatedAt: string | null;
}

export type CostSettingsInput = Partial<Pick<CostSettings, 'bdtPerUsd' | 'providerFeePercent'>> & {
  fixedCosts?: FixedCostItem[];
};

export type CostExportSheet = 'institutions' | 'members' | 'daily';
