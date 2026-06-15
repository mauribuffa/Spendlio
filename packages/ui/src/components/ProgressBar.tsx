import type { HTMLAttributes } from 'react';
import { cn } from '../cn';

export interface ProgressBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /** Amount used (same unit as max — e.g. cents spent). */
  value: number;
  /** Budget ceiling. */
  max: number;
  /** Accessible label describing what the bar measures. */
  label?: string;
}

/**
 * Budget usage bar. Fills green up to the ceiling; once value exceeds max the
 * fill switches to the negative money color to signal over budget. The bar is
 * reinforcement — pair it with a labelled MoneyAmount in the surrounding UI.
 */
export function ProgressBar({ value, max, label, className, style, ...rest }: ProgressBarProps) {
  const safeMax = max > 0 ? max : 0;
  const ratio = safeMax === 0 ? (value > 0 ? 1 : 0) : value / safeMax;
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  const over = value > safeMax && safeMax >= 0;

  return (
    <div
      className={cn('spl-progress', className)}
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      data-over={over || undefined}
      style={{
        width: '100%',
        height: 8,
        borderRadius: 'var(--radius-pill)',
        background: 'var(--neutral-200)',
        overflow: 'hidden',
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: 'var(--radius-pill)',
          background: over ? 'var(--negative-500)' : 'var(--color-primary)',
          transition: 'width var(--motion-medium) var(--ease-out), background-color var(--motion-fast) var(--ease-out)',
        }}
      />
    </div>
  );
}
