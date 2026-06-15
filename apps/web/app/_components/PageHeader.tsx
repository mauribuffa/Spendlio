import type { ReactNode } from 'react';

/** Page title with an optional eyebrow and a right-aligned action slot. */
export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-6)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        {eyebrow ? (
          <span
            style={{
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-eyebrow)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--weight-semibold)',
              color: 'var(--color-ink-subtle)',
            }}
          >
            {eyebrow}
          </span>
        ) : null}
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)' }}>{title}</h1>
      </div>
      {action}
    </header>
  );
}
