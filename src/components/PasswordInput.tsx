import { PasswordField } from '@clickhouse/click-ui';
import { forwardRef, useEffect, useRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { useLocalize } from '@/hooks';

type PasswordInputProps = ComponentPropsWithoutRef<typeof PasswordField>;

/**
 * Wraps click-ui PasswordField to:
 * - Add a visible focus ring on the show/hide toggle (upstream strips outline)
 * - Label the toggle button for screen readers ("Show password" / "Hide password")
 * - Make the toggle `type="button"`: upstream leaves it a submit button, so inside a form
 *   Enter would activate it, revealing the password and submitting. The toggle only mounts
 *   once the field has a value, so this watches the subtree rather than running once
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>((props, ref) => {
  const localize = useLocalize();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const syncToggle = () => {
      const input = wrapper.querySelector('input');
      const button = wrapper.querySelector('button');
      if (!input || !button) return;
      if (button.getAttribute('type') !== 'button') button.setAttribute('type', 'button');
      button.setAttribute(
        'aria-label',
        input.type === 'text'
          ? localize('com_auth_hide_password')
          : localize('com_auth_show_password'),
      );
    };

    syncToggle();

    const observer = new MutationObserver(syncToggle);
    observer.observe(wrapper, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['type'],
    });
    return () => observer.disconnect();
  }, [localize]);

  return (
    <div ref={wrapperRef} className="password-field-a11y w-full">
      {/* eslint-disable-next-line click-ui/form-controlled-components -- value/onChange passed via ...props */}
      <PasswordField ref={ref} {...props} />
    </div>
  );
});
