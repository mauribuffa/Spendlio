import type { HTMLAttributes, ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../cn';

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  tone?: ToastTone;
  /** Optional action element (e.g. an "Undo" button). */
  action?: ReactNode;
  /** When provided, renders a dismiss control that calls this. */
  onDismiss?: () => void;
}

const toneMeta: Record<ToastTone, { icon: typeof Info; color: string }> = {
  info: { icon: Info, color: 'var(--green-900)' },
  success: { icon: CheckCircle2, color: 'var(--positive-500)' },
  error: { icon: AlertTriangle, color: 'var(--negative-500)' },
};

/**
 * Transient message surface. Calm, plain-spoken copy in sentence case. The
 * `tone` icon + color reinforce the message; the words carry it.
 */
export function Toast({ tone = 'info', action, onDismiss, className, style, children, ...rest }: ToastProps) {
  const meta = toneMeta[tone];
  const Icon = meta.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('spl-toast', className)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        maxWidth: 420,
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--neutral-900)',
        color: 'var(--neutral-50)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-sm)',
        ...style,
      }}
      {...rest}
    >
      <Icon size={18} strokeWidth={2} color={meta.color} aria-hidden="true" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, lineHeight: 'var(--leading-normal)' }}>{children}</span>
      {action}
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            display: 'inline-flex',
            background: 'transparent',
            border: 'none',
            color: 'var(--neutral-300)',
            cursor: 'pointer',
            padding: 2,
          }}
        >
          <X size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
