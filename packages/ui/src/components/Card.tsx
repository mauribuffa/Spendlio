import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Inner padding. Defaults to comfortable card padding. */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingValue: Record<NonNullable<CardProps['padding']>, string> = {
  none: '0',
  sm: 'var(--space-3)',
  md: 'var(--space-5)',
  lg: 'var(--space-6)',
};

/**
 * The base surface. White card on the warm canvas, 22px radius, soft shadow.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { padding = 'md', className, style, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn('spl-card', className)}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-sm)',
        padding: paddingValue[padding],
        ...style,
      }}
      {...rest}
    />
  );
});
