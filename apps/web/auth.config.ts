import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe slice of the Auth.js config (no providers — those need Node APIs and
 * live in auth.ts). Middleware builds a NextAuth instance from this to gate routes.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/sign-in' },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const onSignIn = nextUrl.pathname.startsWith('/sign-in');
      if (onSignIn) return isLoggedIn ? Response.redirect(new URL('/', nextUrl)) : true;
      return isLoggedIn; // false → Auth.js redirects to pages.signIn
    },
  },
};
