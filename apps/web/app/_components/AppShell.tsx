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

// Primary nav — ordered to read like the canonical sidebar; the repo's extra
// routes (Receipts, People, Recap) sit beside their natural parents.
const NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/receipts', label: 'Receipts', icon: ReceiptText },
  { href: '/accounts', label: 'Accounts', icon: Landmark },
  { href: '/budgets', label: 'Budgets', icon: Wallet },
  { href: '/split', label: 'Split & settle', icon: Users },
  { href: '/people', label: 'People', icon: UserPlus },
  { href: '/insights', label: 'Assistant', icon: Sparkles },
  { href: '/recap', label: 'Recap', icon: CalendarRange },
] as const;

/** Is `href` the active route? Exact for "/", prefix for the rest. */
function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

/**
 * The web app frame: a fixed 248px sidebar (logo + nav + an "Ask Spendlio AI"
 * promo and the signed-in profile pinned to the foot) plus the scrollable page
 * body on the warm canvas. The page owns its sticky topbar (PageHeader).
 */
export function AppShell({
  user,
  children,
}: {
  user?: { name: string; email: string } | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const settingsActive = pathname.startsWith('/settings');

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: 248,
          flexShrink: 0,
          borderRight: '1px solid var(--border-subtle)',
          background: 'var(--surface-card)',
          padding: '20px 14px',
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Link
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '4px 8px 22px' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" width={30} height={30} alt="" />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 'var(--weight-bold)',
              fontSize: 20,
              letterSpacing: '-0.02em',
              color: 'var(--green-900)',
            }}
          >
            Spendlio
          </span>
        </Link>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
                  gap: 11,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 14,
                  fontWeight: active ? 'var(--weight-semibold)' : 'var(--weight-medium)',
                  color: active ? 'var(--green-800)' : 'var(--text-muted)',
                  background: active ? 'var(--surface-brand-sub)' : 'transparent',
                  transition: 'var(--transition-colors)',
                }}
              >
                <Icon size={18} strokeWidth={2} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom group: AI promo + profile, pinned to the foot of the sidebar. */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link
            href="/insights"
            style={{
              display: 'block',
              background: 'var(--green-900)',
              color: '#fff',
              borderRadius: 'var(--radius-lg)',
              padding: 14,
              textDecoration: 'none',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 'var(--weight-semibold)' }}>
              <Sparkles size={15} strokeWidth={2.2} aria-hidden="true" /> Ask Spendlio AI
            </span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--green-200)', marginTop: 4, lineHeight: 1.4 }}>
              &ldquo;How much did I spend on dining in May?&rdquo;
            </span>
          </Link>

          <Link
            href="/settings"
            aria-current={settingsActive ? 'page' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 8px',
              borderRadius: 'var(--radius-md)',
              background: settingsActive ? 'var(--surface-sunken)' : 'transparent',
              minWidth: 0,
              transition: 'var(--transition-colors)',
            }}
          >
            <Avatar name={user?.name ?? 'Demo User'} size="sm" />
            <span style={{ minWidth: 0, flex: 1 }}>
              <span
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 'var(--weight-semibold)',
                  color: 'var(--text-strong)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.name ?? 'Demo User'}
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: 11.5,
                  color: 'var(--text-subtle)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.email ?? 'dev mode'}
              </span>
            </span>
            <Settings size={16} strokeWidth={2} aria-hidden="true" style={{ color: 'var(--text-subtle)', flex: 'none' }} />
          </Link>
        </div>
      </aside>

      <main
        style={{
          flex: 1,
          minWidth: 0,
          height: '100vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          padding: '0 28px 28px',
        }}
      >
        {children}
      </main>
    </div>
  );
}
