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
  /** The API reports lifecycle state as `status`; there is no `active` flag. */
  status: 'active' | 'suspended' | 'closed';
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

export interface InstitutionPackage {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  monthlyTokenLimit: number;
  active: boolean;
}

export interface UsageModelLimit {
  modelKey: string;
  maxTokens: number | null;
}

/** The editable subset of a policy — what the editor submits to preview/create.
 *  Version, tenant and provenance are assigned by the server. */
export interface UsagePolicyInput {
  mode: 'shadow' | 'enforce';
  timezone: string;
  limits: {
    institutionTokens: number | null;
    memberTokens: number | null;
    modelTokens: UsageModelLimit[];
  };
  warningThresholds: number[];
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

/**
 * - `active`: offered by the server today, shown with the name members see.
 * - `retired`: no longer offered, but still holds usage this period.
 * - `unmatched`: carries a limit that points at no offered or used model.
 */
export type QuotaModelStatus = 'active' | 'retired' | 'unmatched';

export interface QuotaModelRow {
  modelKey: string;
  label: string;
  status: QuotaModelStatus;
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
    accountScope?: 'institution' | 'standalone';
    username?: string | null;
    inviteLink?: string | null;
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

export interface PlatformAgentAccessAgent {
  id: string;
  name: string;
  description?: string;
  tenantId?: string | null;
  enabled: boolean;
}

export interface PlatformAgentAccessGroup {
  id: string;
  name: string;
  description?: string;
  source?: string;
  memberCount: number;
}

export interface PlatformAgentAccessResponse {
  agents: PlatformAgentAccessAgent[];
  groups: PlatformAgentAccessGroup[];
  selectedGroupId: string | null;
}
