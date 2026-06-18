import type { Metadata } from 'next';
import { Space_Grotesk, Hanken_Grotesk, Space_Mono } from 'next/font/google';
// The design system's tokens (CSS custom properties + component rules).
// Imported once here so every page inherits them.
import '@spendlio/ui/styles.css';
import './globals.css';
import { AppShell } from '@/components/layout/app-shell';
import { ToastProvider } from '@/components/feedback/toast-provider';
import { OnboardingFlow } from '@/features/onboarding/components/onboarding-flow';
import { auth } from '@/auth';
import { getMe, type User } from '@/lib/resources';
import { safe } from '@/lib/safe';

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

  // Onboarding gate (ADR-038): a signed-in user with no onboardedAt must finish
  // the one-time flow before the app shell renders, on any route. If /me is
  // unreachable we don't trap them in onboarding — fall through to the shell.
  const me = user ? (await safe<User | null>(() => getMe(), null)).data : null;
  const needsOnboarding = !!me && !me.onboardedAt;

  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <ToastProvider>
          {!user ? (
            children
          ) : needsOnboarding ? (
            <OnboardingFlow />
          ) : (
            <AppShell user={user}>{children}</AppShell>
          )}
        </ToastProvider>
      </body>
    </html>
  );
}
