import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visual error state — pairs the border with the negative money color. */
  invalid?: boolean;
}

/**
 * Single-line text field. Token-driven; uses the body font and card surface.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className, style, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn('spl-input', className)}
      style={{
        width: '100%',
        padding: '10px 14px',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-base)',
        color: 'var(--color-ink)',
        background: 'var(--color-surface)',
        border: `1px solid ${invalid ? 'var(--negative-500)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        outline: 'none',
        transition: 'border-color var(--motion-fast) var(--ease-out)',
        ...style,
      }}
      {...rest}
    />
  );
});
