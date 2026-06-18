import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../cn';

export type BadgeTone =
  | 'neutral'
  | 'brand'
  | 'positive'
  | 'negative'
  | 'warning'
  | 'info'
  | 'solid'
  | 'outline'
  // back-compat aliases
  | 'primary'
  | 'accent';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: BadgeSize;
  /** Leading status dot in the current color. */
  dot?: boolean;
  /** Optional leading icon. */
  icon?: ReactNode;
}

const toneStyle: Record<BadgeTone, CSSProperties> = {
  neutral: { background: 'var(--surface-sunken)', color: 'var(--text-muted)' },
  brand: { background: 'var(--surface-brand-sub)', color: 'var(--green-700)' },
  positive: { background: 'var(--positive-50)', color: 'var(--positive-700)' },
  negative: { background: 'var(--negative-50)', color: 'var(--negative-700)' },
  warning: { background: 'var(--warning-50)', color: 'var(--warning-700)' },
  info: { background: 'var(--info-50)', color: 'var(--info-700)' },
  solid: { background: 'var(--action-primary)', color: 'var(--text-on-brand)' },
  outline: { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-default)' },
  // aliases
  primary: { background: 'var(--surface-brand-sub)', color: 'var(--green-700)' },
  accent: { background: 'var(--sand-100)', color: 'var(--sand-700)' },
};

const sizeStyle: Record<BadgeSize, CSSProperties> = {
  sm: { fontSize: 'var(--text-2xs)', padding: '3px 7px' },
  md: { fontSize: 'var(--text-xs)', padding: '4px 9px' },
};

/**
 * Small status pill. Sentence case, no emoji. An optional dot or icon leads.
 */
export function Badge({ tone = 'neutral', size = 'md', dot = false, icon, children, className, style, ...rest }: BadgeProps) {
  const ts = toneStyle[tone];
  return (
    <span
      className={cn('spl-badge', className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontFamily: 'var(--font-sans)',
        fontWeight: 'var(--weight-semibold)',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        borderRadius: 'var(--radius-pill)',
        border: '1px solid transparent',
        ...sizeStyle[size],
        ...ts,
        ...style,
      }}
      {...rest}
    >
      {dot && (
        <span
          aria-hidden
          style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flex: 'none' }}
        />
      )}
      {icon}
      {children}
    </span>
  );
}
