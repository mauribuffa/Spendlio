import NextAuth, { type NextAuthResult } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { AuthUser, OtpVerifyInput } from '@spendlio/contracts';
import { authConfig } from '@/auth.config';
import { API_BASE, DEMO_USER_ID } from '@/lib/config';

const providers = [
  Credentials({
    id: 'otp',
    name: 'Email code',
    credentials: { email: {}, code: {} },
    async authorize(creds) {
      const parsed = OtpVerifyInput.safeParse(creds);
      if (!parsed.success) return null;
      const res = await fetch(`${API_BASE}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.data),
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const user = AuthUser.safeParse(await res.json());
      return user.success ? { id: user.data.id, email: user.data.email, name: user.data.name } : null;
    },
  }),
];

// Dev-only: sign in as the seeded demo user with no email/OTP (gated by NODE_ENV).
if (process.env.NODE_ENV !== 'production') {
  providers.push(
    Credentials({
      id: 'dev',
      name: 'Dev login',
      credentials: {},
      async authorize() {
        return { id: DEMO_USER_ID, email: 'demo@spendlio.app', name: 'Demo' };
      },
    }),
  );
}

const _auth: NextAuthResult = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    // `authorized` (from authConfig) is middleware-only — Auth.js never invokes it
    // for server-side auth() calls. Middleware builds its own instance from authConfig.
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});

export const handlers: NextAuthResult['handlers'] = _auth.handlers;
export const auth: NextAuthResult['auth'] = _auth.auth;
export const signIn: NextAuthResult['signIn'] = _auth.signIn;
export const signOut: NextAuthResult['signOut'] = _auth.signOut;
