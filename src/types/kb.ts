/** Mirrors `TKbDocument` and friends in librechat-data-provider (`src/kb.ts`). */
export type KbDocumentStatus = 'queued' | 'processing' | 'ready' | 'failed';

export interface KbDocument {
  id: string;
  title: string;
  docType: string;
  status: KbDocumentStatus;
  error: string | null;
  currentVersion: number;
  latestVersion: number;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number;
  chunkCount: number;
  unreadablePages: number[];
  createdAt?: string;
  updatedAt?: string;
}

export interface KbListResponse {
  documents: KbDocument[];
  /** `bytes` is the live files the limit counts; `versions` and `totalBytes` include older versions. */
  usage: { documents: number; bytes: number; versions?: number; totalBytes?: number };
  limits: { maxDocuments: number; maxFileBytes: number; maxTotalBytes: number };
  extensions: string[];
  docTypes: string[];
}

/** One day of a knowledge base's disk use, as `GET …/kb/storage` returns it. */
export interface KbStorageDay {
  day: string;
  documents: number;
  versions: number;
  originalBytes: number;
  parsedBytes: number;
  totalBytes: number;
}

export interface KbStorageCurrent extends Omit<KbStorageDay, 'day'> {
  indexChunks: number;
  limitBytes: number | null;
  measuredAt: string;
  /** Live versions indexed before parsed sizes were recorded (platform view only). */
  unmeasuredVersions?: number;
}

export interface KbInstitutionStorage {
  tenantId: string;
  name: string | null;
  days: number;
  current: KbStorageCurrent;
  daily: KbStorageDay[];
}

export interface KbStorageRow {
  tenantId: string;
  name: string | null;
  status: string | null;
  current: KbStorageCurrent;
  trend: { day: string; totalBytes: number }[];
}

export interface KbPlatformStorage {
  days: number;
  measuredAt: string;
  limitBytes: number | null;
  totals: Omit<KbStorageCurrent, 'limitBytes' | 'measuredAt'>;
  institutions: KbStorageRow[];
}
