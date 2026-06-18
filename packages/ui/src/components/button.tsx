import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { cn } from '../cn';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'accent'
  | 'danger'
  | 'quiet';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch to the full width of the container. */
  fullWidth?: boolean;
  /** Icon rendered before the label. */
  leadingIcon?: ReactNode;
  /** Icon rendered after the label. */
  trailingIcon?: ReactNode;
}

const variantStyle: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: 'var(--action-primary)',
    color: 'var(--text-on-brand)',
    border: '1px solid transparent',
    boxShadow: 'var(--shadow-brand)',
  },
  secondary: {
    background: 'var(--surface-card)',
    color: 'var(--text-strong)',
    border: '1px solid var(--border-default)',
    boxShadow: 'var(--shadow-xs)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-brand)',
    border: '1px solid transparent',
  },
  accent: {
    background: 'var(--action-accent)',
    color: 'var(--text-on-brand)',
    border: '1px solid transparent',
  },
  danger: {
    background: 'var(--negative-500)',
    color: 'var(--text-on-brand)',
    border: '1px solid transparent',
  },
  quiet: {
    background: 'var(--surface-sunken)',
    color: 'var(--text-body)',
    border: '1px solid transparent',
  },
};

// Fixed heights / padding / gap per the canonical size scale.
const sizeStyle: Record<ButtonSize, CSSProperties> = {
  sm: { height: 32, padding: '0 14px', fontSize: 'var(--text-sm)', gap: 6 },
  md: { height: 40, padding: '0 18px', fontSize: 14, gap: 7 },
  lg: { height: 48, padding: '0 24px', fontSize: 'var(--text-base)', gap: 8 },
};

/**
 * Pill action button. Labels are verbs in sentence case ("Add expense").
 * Presses scale to --press-scale; primary carries the soft brand glow.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    fullWidth,
    leadingIcon,
    trailingIcon,
    children,
    className,
    style,
    type,
    ...rest
  },
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
        width: fullWidth ? '100%' : undefined,
        fontFamily: 'var(--font-sans)',
        fontWeight: 'var(--weight-semibold)',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        borderRadius: 'var(--radius-pill)',
        cursor: 'pointer',
        transition: 'var(--transition-control)',
        ...style,
      }}
      {...rest}
    >
      {leadingIcon}
      {children != null && <span>{children}</span>}
      {trailingIcon}
    </button>
  );
});
