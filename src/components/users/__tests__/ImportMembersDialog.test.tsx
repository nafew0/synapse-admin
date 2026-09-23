import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const downloadBlob = vi.fn();

vi.mock('@/utils', () => ({
  downloadBlob: (...args: unknown[]) => downloadBlob(...args),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock('@/server', () => ({
  createMemberImportFn: vi.fn(),
  dryRunMemberImportFn: vi.fn(),
}));

vi.mock('@/components/shared', () => ({
  FormDialog: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
}));

const { ImportMembersDialog } = await import('../ImportMembersDialog');

describe('ImportMembersDialog', () => {
  it('downloads the BOM-prefixed CSV template', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ImportMembersDialog open onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Download a sample CSV' }));

    expect(downloadBlob).toHaveBeenCalledTimes(1);
    const [blob, filename] = downloadBlob.mock.calls[0] as [Blob, string];
    expect(filename).toBe('member-import-template.csv');
    expect(blob.type).toBe('text/csv;charset=utf-8');
    const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
    const csvBytes = new Uint8Array(bytes);
    expect([...csvBytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const csv = new TextDecoder().decode(csvBytes.slice(3));
    expect(csv.startsWith('email,name,role')).toBe(true);
    expect(csv).toContain('member1@your-institution.edu.bd,Full Name,USER');
    expect(csv).toContain('admin1@your-institution.edu.bd,Full Name,INSTITUTION_ADMIN');
  });
});
