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

export type ReconcileStatus = 'ok' | 'flagged' | 'missing_provider' | 'missing_ledger' | 'empty';

export interface ReconcileFigure {
  ledger: number;
  provider: number | null;
  gap: number | null;
  gapPct: number | null;
  status: ReconcileStatus;
}

export interface ReconcilePeriod extends ReconcileFigure {
  period: string;
  days: number;
  daysCovered: number;
  ledgerAll: number;
}

export interface ReconcileService {
  service: 'openrouter' | 'firecrawl';
  label: string;
  unit: 'usd' | 'credits';
  source: {
    status: 'ok' | 'not_configured' | 'rejected' | 'unreadable' | 'unreachable' | 'never_run';
    message?: string;
    lastRunAt?: string;
  };
  usdPerUnit: number | null;
  total: ReconcilePeriod;
  weeks: ReconcilePeriod[];
  days: Array<ReconcileFigure & { day: string }>;
  flagged: number;
}

export interface ReconcileUnstructuredMonth extends ReconcilePeriod {
  pages: number | null;
  note: string | null;
  enteredBy: string | null;
  enteredAt: string | null;
}

export interface Reconciliation {
  range: { start: string; end: string; days: number };
  thresholdPct: number;
  notes: string[];
  services: ReconcileService[];
  unstructured: ReconcileUnstructuredMonth[];
}

export interface ReconcileRefreshResult {
  results: Array<{
    service: string;
    status: string;
    stored: number;
    message?: string;
  }>;
}

export interface UnstructuredEntryInput {
  month: string;
  amountUsd: number;
  pages?: number;
  note?: string;
}
