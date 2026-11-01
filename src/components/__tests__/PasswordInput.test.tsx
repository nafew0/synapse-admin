import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ClickUIProvider } from '@clickhouse/click-ui';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PasswordInput } from '../PasswordInput';

function Form({ onSubmit }: { onSubmit: () => void }) {
  const [value, setValue] = useState('');
  return (
    <ClickUIProvider theme="light">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <PasswordInput value={value} onChange={setValue} />
        <button type="submit">Sign in</button>
      </form>
    </ClickUIProvider>
  );
}

/** The toggle only mounts once the field has a value, so tests start empty and type. */
async function renderAndType(onSubmit: () => void) {
  const { container } = render(<Form onSubmit={onSubmit} />);
  fireEvent.change(container.querySelector('input') as HTMLInputElement, {
    target: { value: 'secret' },
  });
  const toggle = await waitFor(() => {
    const button = container.querySelector<HTMLButtonElement>('.password-field-a11y button');
    expect(button?.getAttribute('type')).toBe('button');
    return button as HTMLButtonElement;
  });
  return { container, toggle };
}

describe('PasswordInput', () => {
  it("makes the Sign in button, not the toggle, the form's submit button", async () => {
    const { container } = await renderAndType(vi.fn());

    expect(container.querySelector('button[type="submit"]')).toBe(
      screen.getByRole('button', { name: 'Sign in' }),
    );
  });

  it('shows the password without submitting when the toggle is clicked', async () => {
    const onSubmit = vi.fn();
    const { container, toggle } = await renderAndType(onSubmit);
    const input = container.querySelector('input');

    expect(input?.type).toBe('password');
    fireEvent.click(toggle);
    expect(input?.type).toBe('text');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
