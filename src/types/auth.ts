import type { ReactNode } from 'react';

export type FieldErrors = {
  email?: string;
  password?: string;
};

export type AuthStep = 'login' | '2fa';

export interface AuthCardProps {
  redirectTo?: string;
  autoRedirectSso?: boolean;
  ssoAvailable?: boolean;
  /** Shown at the foot of the card, under every step. */
  footer?: ReactNode;
}
