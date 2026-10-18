export type CreditPackage = {
  id: string;
  label: string;
  name?: string;
  price: number;
  credits: number;
};
export type CreditGrant = {
  _id: string;
  packageId: string;
  credits: number;
  price: number;
  currency: string;
  source: string;
  reference?: string | null;
  note?: string;
  createdAt?: string;
};
export type UserCredits = {
  balance: number;
  grants: CreditGrant[];
  packages?: { currency: string; list: CreditPackage[] };
};

export type UsagePackageScope = 'member' | 'institution';

/** The fields a superadmin edits. Allowances are in taka; dollar credits are derived server-side. */
export type UsagePackageInput = {
  name: string;
  description: string;
  scopes: UsagePackageScope[];
  price: number;
  monthlyCredit: number;
  weeklyPercent: number | null;
  unlimited: boolean;
  active: boolean;
  sortOrder: number;
};

export type UsagePackage = UsagePackageInput & {
  key: string;
  effectiveWeeklyPercent: number;
  monthlyUsd: number;
  weeklyUsd: number;
  monthlyCredits: number;
  weeklyCredits: number;
  updatedAt: string | null;
};

export type UsagePricingInput = {
  bdtPerUsd: number;
  providerFeePercent: number;
  defaultWeeklyPercent: number;
};

export type UsagePricing = UsagePricingInput & {
  configured: boolean;
  bdtPerUsdEffective: number;
  updatedAt: string | null;
};

export type UsagePackageList = { pricing: UsagePricing; packages: UsagePackage[] };

export type InstitutionUsagePackage = {
  packageKey: string | null;
  memberPackageKey: string | null;
  assignedAt?: string;
};

export type MemberUsagePackage = { packageKey: string; expiresAt: string | null };

/** One allowance window, in credits (USD × 1e6) with taka alongside. */
export type CreditMeter = {
  used: number;
  limit: number | null;
  remaining: number | null;
  usedBdt: number | null;
  limitBdt: number | null;
  blocked: boolean;
  resetsAt: string;
};

export type CreditMemberUsage = {
  userId: string;
  name: string | null;
  email: string | null;
  package: { key: string; name: string; unlimited: boolean } | null;
  /** The member has their own package rather than the institution default. */
  ownPackage: boolean;
  week: CreditMeter;
  month: CreditMeter;
};

/** An institution on usage packages, as the platform console shows it. */
export type CreditConsole = {
  enforced: boolean;
  institutionPackage: string | null;
  defaultMemberPackage: string | null;
  institution: { week: CreditMeter; month: CreditMeter };
  members: CreditMemberUsage[];
};
