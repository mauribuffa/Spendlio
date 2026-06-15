import type { ReactNode } from 'react';

/**
 * Inline, low-key banner. Used to tell the user when the API is unreachable so
 * a page degrades to an empty state instead of an error screen.
 */
export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: ReactNode }) {
  const styles =
    tone === 'warn'
      ? { background: '#F6ECD8', color: 'var(--sand-600)' }
      : { background: 'var(--neutral-100)', color: 'var(--color-ink-muted)' };
  return (
    <div
      role="status"
      style={{
        padding: 'var(--space-3) var(--space-4)',
        borderRadius: 'var(--radius-md)',
        fontSize: 'var(--text-sm)',
        marginBottom: 'var(--space-5)',
        ...styles,
      }}
    >
      {children}
    </div>
  );
}
