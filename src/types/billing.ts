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
