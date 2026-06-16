import type { ReactNode } from 'react';

/**
 * Inline validation error shown beneath a field. Renders nothing when there's
 * no message, so callers can pass a possibly-undefined error directly:
 *   <FieldError>{fieldError('name')}</FieldError>
 */
export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p style={{ color: 'var(--negative-500)', fontSize: 'var(--text-xs)', margin: 'var(--space-1) 0 0' }}>
      {children}
    </p>
  );
}
