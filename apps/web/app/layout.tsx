import type { Metadata } from 'next';
import { Space_Grotesk, Hanken_Grotesk, Space_Mono } from 'next/font/google';
// The design system's tokens (CSS custom properties + component rules).
// Imported once here so every page inherits them.
import '@spendlio/ui/styles.css';
import './globals.css';
import { AppShell } from '@/components/layout/app-shell';
import { ToastProvider } from '@/components/feedback/toast-provider';
import { auth } from '@/auth';

// The three families the design system references. next/font self-hosts them
// and exposes a CSS variable per family; globals.css aliases those variables to
// the package's --font-display / --font-sans / --font-mono.
const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});
const body = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken-grotesk',
  display: 'swap',
});
const mono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Spendlio',
  description: 'Track spending, split bills, settle up.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read the session server-side. When signed out (only the /sign-in route gets
  // here, since middleware redirects everything else) render children bare —
  // no AppShell.
  const session = await auth();
  const user = session?.user
    ? { name: session.user.name ?? 'You', email: session.user.email ?? '' }
    : null;

  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <ToastProvider>
          {user ? <AppShell user={user}>{children}</AppShell> : children}
        </ToastProvider>
      </body>
    </html>
  );
}
