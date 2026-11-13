import { useKbDocuments } from './useKbDocuments';

/** Keeps polling an institution admin's knowledge base from any page, so "ready" notices show wherever they are. */
export function KbWatcher() {
  useKbDocuments();
  return null;
}
