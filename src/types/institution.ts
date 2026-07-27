export interface PlatformInstitutionLimits {
  maxActiveMembers?: number | null;
}

export interface PlatformInstitutionStats {
  activeMembers?: number;
}

export interface PlatformInstitution {
  id?: string;
  _id?: string;
  tenantId: string;
  name: string;
  slug?: string;
  active?: boolean;
  status?: 'active' | 'suspended';
  authDomains?: string[];
  timezone?: string;
  usagePolicyVersion?: number;
  limits?: PlatformInstitutionLimits;
  stats?: PlatformInstitutionStats;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlatformInstitutionListResponse {
  institutions: PlatformInstitution[];
  total: number;
  limit: number;
  offset: number;
}

export interface UsageModelLimit {
  modelKey: string;
  maxTokens: number | null;
}

export interface UsagePolicy {
  tenantId: string;
  version: number;
  mode: 'shadow' | 'enforce';
  timezone: string;
  period: 'calendar_month';
  limits: {
    institutionTokens: number | null;
    memberTokens: number | null;
    modelTokens: UsageModelLimit[];
  };
  warningThresholds: number[];
  effectiveAt: string;
  reason?: string;
  createdAt?: string;
}

export interface UsageBucketHealth {
  scopeType: 'institution' | 'member' | 'model';
  scopeKey: string;
  usedTokens: number;
  reservedTokens: number;
  limit: number | null;
  remaining: number | null;
  utilization: number | null;
  blocked: boolean;
}

export interface UsageWarning {
  _id: string;
  scopeType: 'institution' | 'member' | 'model';
  scopeKey: string;
  threshold: number;
  utilization: number;
  usedTokens: number;
  reservedTokens: number;
  limit: number;
  createdAt: string;
}

export interface QuotaReadinessReport {
  ready: boolean;
  generatedAt: string;
  metrics: {
    observedDays: number;
    attributableCalls: number;
    settledCalls: number;
    unattributedEvents: number;
    duplicateGroups: number;
    staleReservations: number;
    staleRate: number;
    underestimatedCalls: number;
    underestimateRate: number;
    estimationOverageRate: number;
    ledgerCalls: number;
    uncoveredLedgerCalls: number;
    reservationCoverageRate: number;
  };
}

export interface UsagePolicyPreviewImpact {
  scope: 'institution' | 'member' | 'model';
  scopeKey: string;
  used: number;
  reserved: number;
  limit: number | null;
  remaining: number | null;
  blocked: boolean;
  overLimit: boolean;
}

export interface UsagePolicyPreview {
  currentVersion: number;
  proposedPolicy: Omit<UsagePolicy, 'tenantId' | 'version' | 'effectiveAt'>;
  range: { start: string; end: string; timezone: string };
  impacts: UsagePolicyPreviewImpact[];
  blocked: UsagePolicyPreviewImpact[];
  requiresOverageAcknowledgement: boolean;
}

export interface PlatformInstitutionAdminResult {
  user?: {
    id?: string;
    _id?: string;
    email?: string;
    role?: string;
  };
  invite?: {
    _id?: string;
    email?: string;
    status?: string;
    requestedRole?: string;
  };
  inviteLink?: string | null;
}

export interface CreatePlatformInstitutionInput {
  tenantId: string;
  name: string;
  slug?: string;
  adminEmail?: string;
  adminName?: string;
  maxActiveMembers?: number | null;
}

export interface AssignPlatformInstitutionAdminInput {
  tenantId: string;
  email: string;
  name?: string;
}
