import type { HTMLAttributes } from 'react';
import { cn } from '../cn';

export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  /** Orientation of the rule. */
  orientation?: 'horizontal' | 'vertical';
  /** Spacing (margin) around the rule, on the main axis. */
  gap?: 'none' | 'sm' | 'md' | 'lg';
}

const gapValue: Record<NonNullable<DividerProps['gap']>, string> = {
  none: '0',
  sm: 'var(--space-2)',
  md: 'var(--space-4)',
  lg: 'var(--space-6)',
};

/** Hairline rule on the subtle border token. */
export function Divider({ orientation = 'horizontal', gap = 'md', className, style, ...rest }: DividerProps) {
  const g = gapValue[gap];
  const vertical = orientation === 'vertical';
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn('spl-divider', className)}
      style={{
        flex: 'none',
        background: 'var(--border-subtle)',
        ...(vertical
          ? { width: 1, alignSelf: 'stretch', margin: `0 ${g}` }
          : { height: 1, width: '100%', margin: `${g} 0` }),
        ...style,
      }}
      {...rest}
    />
  );
}
