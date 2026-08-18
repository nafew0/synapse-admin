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
