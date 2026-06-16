import NextAuth, { type NextAuthResult } from 'next-auth';
import { authConfig } from '@/auth.config';

// Edge middleware built from the providers-less config; it only reads the
// session cookie and runs the `authorized` callback to gate routes.
const { auth } = NextAuth(authConfig);
export const middleware: NextAuthResult['auth'] = auth;

export const config = {
  // Everything except the Auth.js API, Next internals, and static assets.
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|logo-mark.svg).*)'],
};
