/** Identifies a role or group a user is assigned to. */
export interface AssignmentRef {
  id: string;
  name: string;
}

export type MemberRole =
  | 'USER'
  | 'INSTITUTION_ADMIN'
  | 'INSTITUTION_MEMBER'
  | 'STANDALONE_USER';
export type MemberStatus = 'active' | 'suspended' | 'removed' | 'invited' | 'expired';
export type MemberKind = 'user' | 'invite';

export interface InstitutionSeatSummary {
  activeMembers: number;
  maxActiveMembers?: number | null;
  pendingInvites: number;
  institutions?: number;
}

export interface InstitutionMember {
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

export interface StandaloneInviteResponse {
  invite: {
    _id?: string;
    accountScope?: 'standalone';
    email: string;
    username?: string | null;
    inviteLink?: string | null;
    status?: string;
  };
  inviteLink?: string | null;
}

export interface InstitutionMemberListResponse {
  members: InstitutionMember[];
  total: number;
  limit: number;
  offset: number;
  summary: InstitutionSeatSummary;
}

export interface InstitutionImportRowResult {
  rowNumber: number;
  email?: string;
  name?: string;
  requestedRole?: MemberRole;
  action: 'invite' | 'update_member' | 'skip' | 'error';
  message: string;
}

export interface InstitutionImportSummary {
  totalRows: number;
  invitesCreated: number;
  membersUpdated: number;
  skipped: number;
  errors: number;
}

export interface InstitutionImportJob {
  id: string;
  tenantId: string;
  idempotencyKey: string;
  status: 'pending' | 'completed' | 'failed';
  summary: InstitutionImportSummary;
  results: InstitutionImportRowResult[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
}

export interface ImportMembersDialogProps {
  open: boolean;
  onClose: () => void;
}

export interface UserDetailDialogProps {
  member: InstitutionMember | null;
  onClose: () => void;
  canManage: boolean;
  platform: boolean;
}

export type RoleFilter = 'all' | 'user' | 'institution_admin';
export type StatusFilter = 'all' | MemberStatus;
