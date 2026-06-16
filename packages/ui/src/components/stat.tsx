import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../cn';

export interface StatProps extends HTMLAttributes<HTMLDivElement> {
  /** Letter-spaced eyebrow — the only uppercase in the system. */
  label: string;
  /** The headline value. Pass a MoneyAmount for money figures. */
  value: ReactNode;
  /** Optional supporting line below the value. */
  hint?: ReactNode;
}

/**
 * A labelled headline figure (e.g. "Spent this month"). The label renders as
 * the letter-spaced uppercase eyebrow; the value is whatever you pass in.
 */
export function Stat({ label, value, hint, className, style, ...rest }: StatProps) {
  return (
    <div
      className={cn('spl-stat', className)}
      style={{ fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', ...style }}
      {...rest}
    >
      <span
        style={{
          textTransform: 'uppercase',
          letterSpacing: 'var(--tracking-caps)',
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--weight-semibold)',
          color: 'var(--text-subtle)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-2xl)',
          fontWeight: 'var(--weight-bold)',
          color: 'var(--text-strong)',
          lineHeight: 'var(--leading-tight)',
        }}
      >
        {value}
      </span>
      {hint ? (
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{hint}</span>
      ) : null}
    </div>
  );
}
