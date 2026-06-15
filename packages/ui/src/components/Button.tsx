import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import { cn } from '../cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch to the full width of the container. */
  fullWidth?: boolean;
}

const variantStyle: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: 'var(--action-primary)',
    color: 'var(--text-on-brand)',
    border: '1px solid transparent',
  },
  secondary: {
    background: 'var(--surface-card)',
    color: 'var(--green-900)',
    border: '1px solid var(--border-subtle)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-strong)',
    border: '1px solid transparent',
  },
};

const sizeStyle: Record<ButtonSize, CSSProperties> = {
  sm: { padding: '6px 14px', fontSize: 'var(--text-sm)' },
  md: { padding: '10px 18px', fontSize: 'var(--text-base)' },
};

/**
 * Pill action button. Labels are verbs in sentence case ("Add expense").
 * Presses scale to --press-scale with a short ease-out per the motion tokens.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', fullWidth, className, style, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      data-variant={variant}
      data-size={size}
      className={cn('spl-button', className)}
      style={{
        ...variantStyle[variant],
        ...sizeStyle[size],
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        width: fullWidth ? '100%' : undefined,
        fontFamily: 'var(--font-sans)',
        fontWeight: 'var(--weight-semibold)',
        lineHeight: 1,
        borderRadius: 'var(--radius-pill)',
        cursor: 'pointer',
        transition:
          'transform var(--dur-fast) var(--ease-standard), background-color var(--dur-fast) var(--ease-standard), opacity var(--dur-fast) var(--ease-standard)',
        ...style,
      }}
      {...rest}
    />
  );
});
