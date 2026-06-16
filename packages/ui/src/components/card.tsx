import { forwardRef } from 'react';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../cn';

export type CardVariant = 'default' | 'flat' | 'raised' | 'inverse' | 'brand';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Inner padding of the body. Defaults to comfortable card padding. */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Surface treatment. */
  variant?: CardVariant;
  /** Lifts on hover and presses; use for whole-card links/buttons. */
  interactive?: boolean;
  /** Optional header title — renders a bordered header row. */
  title?: ReactNode;
  /** Optional header action, rendered opposite the title. */
  action?: ReactNode;
}

const paddingValue: Record<NonNullable<CardProps['padding']>, string> = {
  none: '0',
  sm: 'var(--space-3)',
  md: 'var(--space-5)',
  lg: 'var(--space-6)',
};

const variantStyle: Record<CardVariant, CSSProperties> = {
  default: { background: 'var(--surface-card)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-sm)' },
  flat: { background: 'var(--surface-card)', borderColor: 'var(--border-subtle)', boxShadow: 'none' },
  raised: { background: 'var(--surface-card)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-md)' },
  inverse: { background: 'var(--surface-inverse)', borderColor: 'transparent', color: 'var(--text-on-dark)', boxShadow: 'none' },
  brand: { background: 'var(--surface-brand-sub)', borderColor: 'var(--green-100)', boxShadow: 'none' },
};

/**
 * The base surface. White card on the warm canvas, 22px radius, soft shadow.
 * Supports inverse/brand surfaces and an optional bordered header.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { padding = 'md', variant = 'default', interactive = false, title, action, children, className, style, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      data-variant={variant}
      data-interactive={interactive ? 'true' : undefined}
      className={cn('spl-card', interactive && 'spl-card--interactive', className)}
      style={{
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-card)',
        color: 'var(--text-body)',
        overflow: 'hidden',
        ...variantStyle[variant],
        ...(interactive ? { cursor: 'pointer', transition: 'var(--transition-control)' } : null),
        ...style,
      }}
      {...rest}
    >
      {title != null && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            padding: '16px var(--space-5)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 'var(--weight-bold)',
              fontSize: 16,
              letterSpacing: '-0.01em',
              color: 'var(--text-strong)',
            }}
          >
            {title}
          </span>
          {action}
        </div>
      )}
      <div style={{ padding: paddingValue[padding] }}>{children}</div>
    </div>
  );
});
