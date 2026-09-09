/**
 * Hands a fetched file to the browser as a download.
 *
 * The object URL is revoked on the next tick rather than immediately: Safari
 * aborts the download if the URL is released before the synthetic click has been
 * processed.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** `<name>-YYYY-MM-DD.<ext>`, the naming every admin export uses. */
export function datedFilename(name: string, extension: string): string {
  return `${name}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}
