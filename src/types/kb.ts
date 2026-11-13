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
  usage: { documents: number; bytes: number };
  limits: { maxDocuments: number; maxFileBytes: number; maxTotalBytes: number };
  extensions: string[];
  docTypes: string[];
}
