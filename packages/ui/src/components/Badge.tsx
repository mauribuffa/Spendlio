import type { HTMLAttributes } from 'react';
import { cn } from '../cn';

export type BadgeTone = 'neutral' | 'primary' | 'positive' | 'negative' | 'accent';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneStyle: Record<BadgeTone, { background: string; color: string }> = {
  neutral: { background: 'var(--neutral-100)', color: 'var(--color-ink-muted)' },
  primary: { background: 'var(--green-50)', color: 'var(--green-800)' },
  positive: { background: 'var(--green-50)', color: 'var(--positive-500)' },
  negative: { background: '#F7E7E4', color: 'var(--negative-500)' },
  accent: { background: '#F6ECD8', color: 'var(--sand-600)' },
};

/**
 * Small status pill. Sentence case, no emoji.
 */
export function Badge({ tone = 'neutral', className, style, ...rest }: BadgeProps) {
  return (
    <span
      className={cn('spl-badge', className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        padding: '2px 10px',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--weight-medium)',
        lineHeight: 1.4,
        borderRadius: 'var(--radius-pill)',
        ...toneStyle[tone],
        ...style,
      }}
      {...rest}
    />
  );
}
