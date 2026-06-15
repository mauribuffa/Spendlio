import type { ReactNode } from 'react';
import Link from 'next/link';
import { Plus, ScanLine } from 'lucide-react';

/** A pill link styled like the design system's primary/secondary Button. */
function ToolbarLink({
  href,
  variant,
  icon,
  children,
}: {
  href: string;
  variant: 'primary' | 'secondary';
  icon: ReactNode;
  children: ReactNode;
}) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 40,
    padding: '0 18px',
    fontFamily: 'var(--font-sans)',
    fontWeight: 'var(--weight-semibold)',
    fontSize: 14,
    lineHeight: 1,
    whiteSpace: 'nowrap' as const,
    borderRadius: 'var(--radius-pill)',
    transition: 'var(--transition-control)',
  };
  const variantStyle =
    variant === 'primary'
      ? { background: 'var(--action-primary)', color: 'var(--text-on-brand)', border: '1px solid transparent', boxShadow: 'var(--shadow-brand)' }
      : { background: 'var(--surface-card)', color: 'var(--text-strong)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-xs)' };
  return (
    <Link href={href} className="spl-button" data-variant={variant} style={{ ...base, ...variantStyle }}>
      {icon}
      <span>{children}</span>
    </Link>
  );
}

/**
 * The sticky, backdrop-blurred page topbar. Title (with optional eyebrow +
 * subtitle) on the left; on the right, either a custom `action` slot or the
 * default global actions (Scan a receipt · Add expense). Full-bleed across the
 * scroll container via negative margins so the blur spans edge to edge.
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
  const right =
    action ??
    (hideActions ? null : (
      <>
        <ToolbarLink href="/receipts" variant="secondary" icon={<ScanLine size={17} strokeWidth={2} aria-hidden="true" />}>
          Scan
        </ToolbarLink>
        <ToolbarLink href="/transactions" variant="primary" icon={<Plus size={17} strokeWidth={2} aria-hidden="true" />}>
          Add expense
        </ToolbarLink>
      </>
    ));

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-5)',
        margin: '0 -28px var(--space-6)',
        padding: '20px 28px',
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
