'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Users,
  Sparkles,
  Settings,
} from 'lucide-react';
import type { ReactNode } from 'react';

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/budgets', label: 'Budgets', icon: Wallet },
  { href: '/split', label: 'Split', icon: Users },
  { href: '/insights', label: 'Insights', icon: Sparkles },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

/** Is `href` the active route? Exact for "/", prefix for the rest. */
function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

/**
 * The web app frame: a fixed sidebar (the web-kit layout) plus the page body
 * on the warm canvas. Composed from design tokens; the page itself owns its
 * content using @spendlio/ui components.
 */
export function AppShell({ children }: { children: ReactNode }) {
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
          <span
            aria-hidden="true"
            style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary)',
              display: 'inline-block',
            }}
          />
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
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: 'var(--space-8)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>{children}</div>
      </main>
    </div>
  );
}
