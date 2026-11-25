import type { BdrenOverride, MemberUsagePackage } from './billing';
/** Identifies a role or group a user is assigned to. */
export interface AssignmentRef {
  id: string;
  name: string;
}

export type MemberRole = 'USER' | 'INSTITUTION_ADMIN' | 'INSTITUTION_MEMBER' | 'STANDALONE_USER';
export type MemberStatus = 'active' | 'suspended' | 'removed' | 'invited' | 'expired';
export type MemberKind = 'user' | 'invite';

export interface InstitutionSeatSummary {
  activeMembers: number;
  maxActiveMembers?: number | null;
  pendingInvites: number;
  institutions?: number;
}

export interface InstitutionMember {
  /** The member's own usage package (platform view only). */
  usagePackage?: MemberUsagePackage | null;
  /** bdren.ai supplies this person's limits, so their own package is an emergency override (platform view only). */
  limitsManagedElsewhere?: boolean;
  /** bdren.ai's live override for this person, if any (platform view only). */
  bdrenOverride?: BdrenOverride | null;
  id: string;
  kind: MemberKind;
  tenantId?: string;
  accountScope?: 'institution' | 'standalone';
  institutionName?: string;
  name: string;
  username?: string | null;
  email: string;
  emailVerified?: boolean;
  role: MemberRole;
  status: MemberStatus;
  provider?: string;
  createdAt?: string;
  updatedAt?: string;
  inviteStatus?: string;
  inviteSource?: string;
  lastSentAt?: string;
  expiresAt?: string;
  suspendedAt?: string | null;
  removedAt?: string | null;
  acceptedAt?: string | null;
}

export interface InstitutionMemberListResponse {
  members: InstitutionMember[];
  total: number;
  limit: number;
  offset: number;
  summary: InstitutionSeatSummary;
}

export interface MemberPanelProps {
  member: InstitutionMember | null;
  onClose: () => void;
  canManage: boolean;
  platform: boolean;
}

export type RoleFilter = 'all' | 'user' | 'institution_admin';
export type StatusFilter = 'all' | MemberStatus;
