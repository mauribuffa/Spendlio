import type { ReactNode } from 'react';
import { TopbarActions } from '@/components/expenses/TopbarActions';

/**
 * The sticky, backdrop-blurred page topbar. Title (with optional eyebrow +
 * subtitle) on the left; on the right, either a custom `action` slot or the
 * default global actions (Scan a receipt · Add expense) which open modals.
 * Full-bleed across the scroll container via negative margins so the blur
 * spans edge to edge.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  hideActions = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  hideActions?: boolean;
}) {
  const right = action ?? (hideActions ? null : <TopbarActions />);

  return (
    <header
      className="spl-pageheader"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'rgba(250, 250, 247, 0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        {eyebrow ? (
          <span
            style={{
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-caps)',
              fontSize: 'var(--text-2xs)',
              fontWeight: 'var(--weight-semibold)',
              color: 'var(--text-subtle)',
            }}
          >
            {eyebrow}
          </span>
        ) : null}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            fontWeight: 'var(--weight-bold)',
            letterSpacing: '-0.02em',
            color: 'var(--text-strong)',
            margin: 0,
          }}
        >
          {title}
        </h1>
        {subtitle ? (
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{subtitle}</span>
        ) : null}
      </div>
      {right ? <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 'none' }}>{right}</div> : null}
    </header>
  );
}
