'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowLeftRight,
  ReceiptText,
  Wallet,
  Users,
  Sparkles,
  CalendarRange,
  Settings,
  Landmark,
  UserPlus,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar } from '@spendlio/ui';

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/receipts', label: 'Receipts', icon: ReceiptText },
  { href: '/accounts', label: 'Accounts', icon: Landmark },
  { href: '/budgets', label: 'Budgets', icon: Wallet },
  { href: '/split', label: 'Split', icon: Users },
  { href: '/people', label: 'People', icon: UserPlus },
  { href: '/insights', label: 'Insights', icon: Sparkles },
  { href: '/recap', label: 'Recap', icon: CalendarRange },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

/** Is `href` the active route? Exact for "/", prefix for the rest. */
function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

/** The Spendlio mark: a rounded green tile with a concentric ring. */
function Logo() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 30,
        height: 30,
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-primary)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="6.5" stroke="var(--color-on-primary)" strokeWidth="2" />
        <circle cx="9" cy="9" r="2" fill="var(--color-on-primary)" />
      </svg>
    </span>
  );
}

/**
 * The web app frame: a fixed sidebar (logo + nav + an "Ask Spendlio AI" promo
 * and the signed-in profile pinned to the bottom) plus the page body on the
 * warm canvas. Composed from design tokens; pages own their content.
 */
export function AppShell({
  user,
  children,
}: {
  user?: { name: string; email: string } | null;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: 248,
          flexShrink: 0,
          borderRight: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          padding: 'var(--space-6) var(--space-4)',
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: '0 var(--space-2)',
          }}
        >
          <Logo />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 'var(--weight-bold)',
              fontSize: 'var(--text-lg)',
              color: 'var(--color-primary-ink)',
            }}
          >
            Spendlio
          </span>
        </Link>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: '10px var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: active ? 'var(--weight-semibold)' : 'var(--weight-medium)',
                  color: active ? 'var(--color-primary-ink)' : 'var(--color-ink-muted)',
                  background: active ? 'var(--green-50)' : 'transparent',
                }}
              >
                <Icon size={18} strokeWidth={2} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom group: AI promo + profile, pinned to the foot of the sidebar. */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Link
            href="/insights"
            style={{
              display: 'block',
              background: 'var(--color-primary-ink)',
              color: 'var(--color-on-primary)',
              borderRadius: 'var(--radius-card)',
              padding: 'var(--space-4)',
              textDecoration: 'none',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-2)',
              }}
            >
              <Sparkles size={16} strokeWidth={2.2} aria-hidden="true" />
              <span style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>
                Ask Spendlio AI
              </span>
            </span>
            <span style={{ fontSize: 'var(--text-xs)', opacity: 0.85, lineHeight: 1.4 }}>
              &ldquo;How much did I spend on dining in May?&rdquo;
            </span>
          </Link>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: '0 var(--space-2)',
              minWidth: 0,
            }}
          >
            <Avatar name={user?.name ?? 'Demo User'} size="sm" />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--weight-semibold)',
                  color: 'var(--color-ink)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.name ?? 'Demo User'}
              </div>
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-ink-subtle)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.email ?? 'dev mode'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: 'var(--space-8)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>{children}</div>
      </main>
    </div>
  );
}
