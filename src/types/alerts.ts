export type AlertSeverity = 'critical' | 'warning';

export type AlertKind =
  | 'openrouter_key'
  | 'openrouter_expiry'
  | 'openrouter_balance'
  | 'firecrawl_key'
  | 'firecrawl_credits'
  | 'spend_spike';

/** A provider or spend condition the platform raised for superadmins. */
export interface PlatformAlert {
  _id: string;
  key: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  detail: string;
  status: 'open' | 'resolved';
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt?: string | null;
  seenAt?: string | null;
  seenBy?: string | null;
}

export interface PlatformAlertList {
  alerts: PlatformAlert[];
  /** Open alerts nobody has marked seen. */
  unseen: number;
}
