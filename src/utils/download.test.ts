import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { datedFilename, downloadBlob } from './download';

describe('datedFilename', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-12T22:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stamps the name with the current date and extension', () => {
    expect(datedFilename('members', 'xlsx')).toBe('members-2026-03-12.xlsx');
    expect(datedFilename('audit-log', 'csv')).toBe('audit-log-2026-03-12.csv');
  });
});

describe('downloadBlob', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:fake-url');
    revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;
  });

  it('clicks a detached anchor carrying the requested filename', () => {
    const clicked: Array<{ download: string; href: string }> = [];
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const element = realCreate(tag) as HTMLAnchorElement;
      if (tag === 'a') {
        element.click = () => clicked.push({ download: element.download, href: element.href });
      }
      return element;
    });

    downloadBlob(new Blob(['x']), 'members-2026-03-12.xlsx');

    expect(clicked).toEqual([{ download: 'members-2026-03-12.xlsx', href: 'blob:fake-url' }]);
    expect(document.body.querySelector('a')).toBeNull();
    vi.restoreAllMocks();
  });

  /** Safari aborts the download if the object URL is released before the
   *  synthetic click has been processed. */
  it('defers revoking the object URL past the click', () => {
    vi.useFakeTimers();
    downloadBlob(new Blob(['x']), 'f.xlsx');

    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
    vi.useRealTimers();
  });
});
