# Phase 5 Auth (Email OTP + Auth.js + short-lived JWT) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dev `x-user-id` trust path with real authentication — email OTP sign-in via Auth.js on the web, a short-lived JWT the API verifies, and first-sign-in user provisioning — without breaking any existing flow.

**Architecture:** The architecture stays **web → API → DB**. Auth.js (next-auth v5, JWT sessions, no DB adapter) runs on the web; on each server request the web mints a short-lived HS256 JWT (`jose`) from the session and sends `Authorization: Bearer …`. The API's per-route `AuthGuard` verifies it and sets `req.user.id` — every existing `WHERE user_id = …` query is unchanged. The API owns the OTP challenge (codes hashed in Redis with a TTL) and provisions users by the already-unique `email`. Full design: `docs/superpowers/specs/2026-06-16-phase-5-auth-otp-design.md`; decision: ADR-033.

**Tech Stack:** NestJS 11, Next.js 16 / React 19, Auth.js (next-auth ^5 beta), `jose`, Drizzle, ioredis (via `@spendlio/queue`), Zod (`@spendlio/contracts`), Vitest.

---

## Conventions for every task

- **Commit trailer:** every commit message ends with the trailer
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` (omitted from the snippets below for brevity — add it to each commit).
- **Branch:** work continues on `phase-5-auth` (already created; the design docs are committed there). Do **not** push (the user pushes).
- **Money/IDs/scoping rules** from `CLAUDE.md` still apply.

## Testing strategy (read first)

This repo runs Vitest **only in packages** (`contracts`, `core`, `queue`); `apps/api` and `apps/web` have **no test runner** (only `typecheck`/`build`). To match that established pattern (and stay surgical), this plan:

- **Unit-tests the new contracts** in `packages/contracts` (true TDD).
- **Integration-tests the whole auth path** by extending the existing live contract test (`packages/contracts/src/api-contract.live.test.ts`) — it runs under Vitest, hits the live API on `:4000`, and already skips cleanly when the API is down. This is where the Bearer-token guard, the 401 paths, and the OTP endpoints get exercised.
- **Verifies the apps** via `pnpm typecheck` (whole monorepo), `pnpm --filter @spendlio/web build`, and the manual acceptance checklist in the final task. Auth.js wiring, middleware, the guard, and the UI are integration/manual-verified — not unit-tested — because there is no app-level runner and adding one is out of scope.

Acceptance gates (must all pass at the end):
`pnpm typecheck` · `pnpm --filter @spendlio/ui test` · `pnpm --filter @spendlio/contracts test` · `pnpm --filter @spendlio/web build`.

---

## Task 1: Auth contracts (Zod, framework-free) — TDD

**Files:**
- Create: `packages/contracts/src/auth.ts`
- Create: `packages/contracts/src/auth.test.ts`
- Modify: `packages/contracts/src/index.ts` (add one export line)

- [ ] **Step 1: Write the failing test**

Create `packages/contracts/src/auth.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { OtpRequestInput, OtpVerifyInput, OtpRequestResult, AuthUser } from './auth';

describe('auth contracts', () => {
  it('OtpRequestInput requires a valid email', () => {
    expect(OtpRequestInput.safeParse({ email: 'a@b.com' }).success).toBe(true);
    expect(OtpRequestInput.safeParse({ email: 'nope' }).success).toBe(false);
  });

  it('OtpVerifyInput requires email + a 6-digit code', () => {
    expect(OtpVerifyInput.safeParse({ email: 'a@b.com', code: '123456' }).success).toBe(true);
    expect(OtpVerifyInput.safeParse({ email: 'a@b.com', code: '12345' }).success).toBe(false);
    expect(OtpVerifyInput.safeParse({ email: 'a@b.com', code: 'abcdef' }).success).toBe(false);
  });

  it('OtpRequestResult allows an optional dev code', () => {
    expect(OtpRequestResult.safeParse({ ok: true }).success).toBe(true);
    expect(OtpRequestResult.safeParse({ ok: true, devCode: '123456' }).success).toBe(true);
    expect(OtpRequestResult.safeParse({ ok: false }).success).toBe(false);
  });

  it('AuthUser requires id (uuid) + email + name', () => {
    const ok = AuthUser.safeParse({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'demo@spendlio.app',
      name: 'Demo',
    });
    expect(ok.success).toBe(true);
    expect(AuthUser.safeParse({ id: 'x', email: 'demo@spendlio.app', name: 'Demo' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @spendlio/contracts test -- src/auth.test.ts`
Expected: FAIL — `Cannot find module './auth'`.

- [ ] **Step 3: Create the implementation**

Create `packages/contracts/src/auth.ts`:

```ts
import { z } from 'zod';

/** Sign-in step 1: ask for a one-time code. */
export const OtpRequestInput = z.object({ email: z.string().email() });
export type OtpRequestInput = z.infer<typeof OtpRequestInput>;

/**
 * Response of step 1. `devCode` is echoed back ONLY when the API runs with
 * NODE_ENV !== 'production', so local dev + the live contract test can complete
 * the flow without reading email. Never present in production.
 */
export const OtpRequestResult = z.object({
  ok: z.literal(true),
  devCode: z.string().regex(/^\d{6}$/).optional(),
});
export type OtpRequestResult = z.infer<typeof OtpRequestResult>;

/** Sign-in step 2: submit the code. */
export const OtpVerifyInput = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});
export type OtpVerifyInput = z.infer<typeof OtpVerifyInput>;

/** The identity the API returns on a successful verify (after provisioning). */
export const AuthUser = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
});
export type AuthUser = z.infer<typeof AuthUser>;
```

- [ ] **Step 4: Export from the barrel**

In `packages/contracts/src/index.ts`, add after the `export * from './user';` line:

```ts
export * from './auth';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @spendlio/contracts test`
Expected: PASS (the new file + all existing contract tests).

- [ ] **Step 6: Commit**

```bash
git add packages/contracts/src/auth.ts packages/contracts/src/auth.test.ts packages/contracts/src/index.ts
git commit -m "feat(contracts): add email-OTP auth schemas (OtpRequest/Verify/Result, AuthUser)"
```

---

## Task 2: Dependencies + env placeholders

**Files:**
- Modify: `apps/api/package.json` (add `jose`)
- Modify: `packages/contracts/package.json` (add `jose` devDep — used by the live test)
- Modify: `.env.example`

- [ ] **Step 1: Add `jose` to the API and contracts**

Run:

```bash
pnpm --filter @spendlio/api add jose@^5.9.6
pnpm --filter @spendlio/contracts add -D jose@^5.9.6
```

Expected: both `package.json` files gain `jose`; `pnpm-lock.yaml` updates.

- [ ] **Step 2: Update `.env.example`**

In `.env.example`, replace the block:

```
# Auth (fill when you reach Phase 5)
AUTH_SECRET=change-me-dev-only
JWT_SECRET=change-me-dev-only
```

with:

```
# Auth (Phase 5 — email OTP + Auth.js + short-lived JWT to the API; ADR-033)
AUTH_SECRET=change-me-dev-only        # Auth.js session secret (web)
AUTH_URL=http://localhost:3000        # Auth.js base URL (web)
API_JWT_SECRET=change-me-dev-only     # shared HS256 secret: web mints, API verifies
EMAIL_FROM=Spendlio <no-reply@spendlio.app>   # used by the prod email adapter (deferred)
```

- [ ] **Step 3: Mirror it into your local `.env`** (if you have one)

Add `AUTH_URL`, `API_JWT_SECRET`, and `EMAIL_FROM` to your local `.env` (same values as above for dev). The app falls back to `change-me-dev-only` if `API_JWT_SECRET` is unset, so dev still works without it — but set it to be explicit.

- [ ] **Step 4: Commit**

```bash
git add apps/api/package.json packages/contracts/package.json pnpm-lock.yaml .env.example
git commit -m "chore(auth): add jose dep + Phase 5 env placeholders (API_JWT_SECRET, AUTH_URL)"
```

---

## Task 3: API — EmailSender interface + console dev sender

**Files:**
- Create: `apps/api/src/auth/email/email-sender.ts`
- Create: `apps/api/src/auth/email/console-email-sender.ts`

- [ ] **Step 1: Create the interface + DI token**

Create `apps/api/src/auth/email/email-sender.ts`:

```ts
/** DI token for the email transport (target interfaces, not vendors — golden rule #6). */
export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

export interface EmailSender {
  /** Deliver a one-time code to `to`. Implementations must not throw on success. */
  sendOtpCode(to: string, code: string): Promise<void>;
}
```

- [ ] **Step 2: Create the dev console sender**

Create `apps/api/src/auth/email/console-email-sender.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import type { EmailSender } from './email-sender';

/**
 * Dev transport: log the code to the API console. No external infra. The prod
 * vendor (Resend/SMTP/SES) is a later ADR (decisions.md open question #2).
 */
@Injectable()
export class ConsoleEmailSender implements EmailSender {
  private readonly log = new Logger('EmailSender');
  async sendOtpCode(to: string, code: string): Promise<void> {
    this.log.log(`OTP for ${to}: ${code}`);
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @spendlio/api typecheck`
Expected: PASS (no usages yet, but the files compile).

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/auth/email/
git commit -m "feat(api): EmailSender interface + ConsoleEmailSender (dev transport)"
```

---

## Task 4: API — OtpService (Redis store, verify, provisioning)

**Files:**
- Create: `apps/api/src/auth/otp.service.ts`

- [ ] **Step 1: Create the service**

Create `apps/api/src/auth/otp.service.ts`:

```ts
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { users } from '@spendlio/db';
import { getRedisClient } from '@spendlio/queue';
import type { AuthUser } from '@spendlio/contracts';
import { DB } from '../db/db.module';
import { EMAIL_SENDER, type EmailSender } from './email/email-sender';

const TTL_SECONDS = 600; // 10 min
const COOLDOWN_SECONDS = 60; // resend cooldown
const MAX_ATTEMPTS = 5;

function secret(): string {
  return process.env.API_JWT_SECRET ?? 'change-me-dev-only';
}
/** HMAC the code so a casual Redis read can't reveal it to re-email. The real
 *  protection is the attempt-limit + TTL + single-use. */
function hashCode(code: string): string {
  return createHmac('sha256', secret()).update(code).digest('hex');
}
function key(email: string): string {
  return `otp:${email.toLowerCase()}`;
}
function cooldownKey(email: string): string {
  return `otp:cooldown:${email.toLowerCase()}`;
}

@Injectable()
export class OtpService {
  constructor(
    @Inject(DB) private db: any,
    @Inject(EMAIL_SENDER) private email: EmailSender,
  ) {}

  /** Generate + store + email a code. Returns the code only in non-prod. */
  async request(email: string): Promise<{ devCode?: string }> {
    const redis = getRedisClient();
    // Resend cooldown: silently no-op (caller still returns 200) if sent recently.
    if (await redis.get(cooldownKey(email))) return {};

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await redis.set(
      key(email),
      JSON.stringify({ codeHash: hashCode(code), attempts: 0 }),
      'EX',
      TTL_SECONDS,
    );
    await redis.set(cooldownKey(email), '1', 'EX', COOLDOWN_SECONDS);
    await this.email.sendOtpCode(email, code);
    return process.env.NODE_ENV !== 'production' ? { devCode: code } : {};
  }

  /** Verify a code; on success provision the user and return it. */
  async verify(email: string, code: string): Promise<AuthUser> {
    const redis = getRedisClient();
    const raw = await redis.get(key(email));
    if (!raw) throw new UnauthorizedException('Code expired or not found.');
    const { codeHash, attempts } = JSON.parse(raw) as { codeHash: string; attempts: number };

    const a = Buffer.from(hashCode(code), 'hex');
    const b = Buffer.from(codeHash, 'hex');
    const matches = a.length === b.length && timingSafeEqual(a, b);
    if (!matches) {
      const next = attempts + 1;
      if (next >= MAX_ATTEMPTS) await redis.del(key(email));
      else await redis.set(key(email), JSON.stringify({ codeHash, attempts: next }), 'KEEPTTL');
      throw new UnauthorizedException('Incorrect code.');
    }

    await redis.del(key(email)); // single-use
    await redis.del(cooldownKey(email));
    return this.provision(email);
  }

  /** Upsert a user keyed on the unique email (first sign-in = account creation). */
  private async provision(email: string): Promise<AuthUser> {
    const lower = email.toLowerCase();
    const name = lower.split('@')[0];
    await this.db
      .insert(users)
      .values({ email: lower, name })
      .onConflictDoNothing({ target: users.email });
    const [row] = await this.db.select().from(users).where(eq(users.email, lower));
    return { id: row.id, email: row.email, name: row.name };
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @spendlio/api typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/auth/otp.service.ts
git commit -m "feat(api): OtpService — Redis-backed codes, attempt limits, provision-by-email"
```

---

## Task 5: API — public AuthController + AuthModule + registration

**Files:**
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/auth.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create the controller (PUBLIC — no guard)**

Create `apps/api/src/auth/auth.controller.ts`:

```ts
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { OtpRequestInput, OtpVerifyInput } from '@spendlio/contracts';
import { ZodPipe } from '../common/zod.pipe';
import { OtpService } from './otp.service';

// PUBLIC: these establish identity before any token exists, so no @UseGuards.
@Controller('auth/otp')
export class AuthController {
  constructor(private otp: OtpService) {}

  @Post('request')
  @HttpCode(200)
  async request(@Body(new ZodPipe(OtpRequestInput)) dto: OtpRequestInput) {
    const { devCode } = await this.otp.request(dto.email);
    // Always 200, no enumeration. devCode only present in non-prod.
    return { ok: true as const, ...(devCode ? { devCode } : {}) };
  }

  @Post('verify')
  @HttpCode(200)
  verify(@Body(new ZodPipe(OtpVerifyInput)) dto: OtpVerifyInput) {
    return this.otp.verify(dto.email, dto.code); // throws 401 on bad/expired code
  }
}
```

- [ ] **Step 2: Create the module**

Create `apps/api/src/auth/auth.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { OtpService } from './otp.service';
import { EMAIL_SENDER } from './email/email-sender';
import { ConsoleEmailSender } from './email/console-email-sender';

// DbModule is @Global, so OtpService can inject DB without importing it here.
@Module({
  controllers: [AuthController],
  providers: [OtpService, { provide: EMAIL_SENDER, useClass: ConsoleEmailSender }],
})
export class AuthModule {}
```

- [ ] **Step 3: Register in `app.module.ts`**

In `apps/api/src/app.module.ts`, add the import near the other module imports:

```ts
import { AuthModule } from './auth/auth.module';
```

and add `AuthModule,` to the `imports: [...]` array (e.g. right after `DbModule,`).

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @spendlio/api typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/auth.controller.ts apps/api/src/auth/auth.module.ts apps/api/src/app.module.ts
git commit -m "feat(api): public auth/otp request+verify endpoints (AuthModule)"
```

---

## Task 6: API — replace the AuthGuard with JWT verification

**Files:**
- Modify: `apps/api/src/common/auth.guard.ts` (full rewrite)

- [ ] **Step 1: Rewrite the guard**

Replace the entire contents of `apps/api/src/common/auth.guard.ts` with:

```ts
// auth.guard.ts — verifies the short-lived Bearer JWT the web mints (ADR-033).
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtVerify } from 'jose';

function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.API_JWT_SECRET ?? 'change-me-dev-only');
}

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
    if (!token) throw new UnauthorizedException('Missing bearer token');
    try {
      const { payload } = await jwtVerify(token, secret(), {
        issuer: 'spendlio-web',
        audience: 'spendlio-api',
      });
      if (!payload.sub) throw new Error('missing sub');
      req.user = { id: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
```

(The `@CurrentUser()` decorator in `common/current-user.decorator.ts` is unchanged — it still reads `req.user`.)

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @spendlio/api typecheck`
Expected: PASS.

- [ ] **Step 3: Manual smoke (optional but recommended)**

With the stack up (`docker compose up -d`, API running, seeded), confirm the guard rejects unauthenticated calls:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4000/api/me
```

Expected: `401`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/common/auth.guard.ts
git commit -m "feat(api): verify Bearer JWT in AuthGuard; remove x-user-id trust path"
```

---

## Task 7: Web — install Auth.js + jose, and a compatibility checkpoint

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Install**

Run:

```bash
pnpm --filter @spendlio/web add next-auth@^5.0.0-beta.29 jose@^5.9.6
```

Expected: `apps/web/package.json` gains `next-auth` + `jose`; lockfile updates.

- [ ] **Step 2: Compatibility checkpoint (resolves spec risk #1)**

Create a throwaway probe `apps/web/auth-probe.ts`:

```ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
export const _probe = { NextAuth, Credentials };
```

Run: `pnpm --filter @spendlio/web typecheck`
Expected: PASS (next-auth v5 resolves against Next 16 / React 19).

**If it fails** (next-auth v5 incompatible with Next 16): stop and report. Fallback options, in order: (a) pin the latest known-good `next-auth@5` beta that supports Next 16; (b) if none, implement a minimal cookie session by hand (sign a session JWT with `jose`, set an httpOnly cookie in a route handler, read it in `getApiToken()` + middleware) — same token model, no next-auth. Do not proceed past this task until the probe compiles.

- [ ] **Step 3: Delete the probe**

```bash
rm apps/web/auth-probe.ts
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore(web): add next-auth v5 + jose (compatibility verified)"
```

---

## Task 8: Web — Auth.js config (split edge/node), route handler, session types

**Files:**
- Create: `apps/web/auth.config.ts`
- Create: `apps/web/auth.ts`
- Create: `apps/web/app/api/auth/[...nextauth]/route.ts`
- Create: `apps/web/types/next-auth.d.ts`

- [ ] **Step 1: Edge-safe config (used by middleware)**

Create `apps/web/auth.config.ts`:

```ts
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
```

- [ ] **Step 2: Full config with providers (Node side)**

Create `apps/web/auth.ts`:

```ts
import NextAuth from 'next-auth';
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
```

- [ ] **Step 3: Route handler**

Create `apps/web/app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from '@/auth';

export const { GET, POST } = handlers;
```

- [ ] **Step 4: Session type augmentation**

Create `apps/web/types/next-auth.d.ts`:

```ts
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user'];
  }
}
```

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @spendlio/web typecheck`
Expected: PASS (`session.user.id` is now typed).

- [ ] **Step 6: Commit**

```bash
git add apps/web/auth.config.ts apps/web/auth.ts "apps/web/app/api/auth/[...nextauth]/route.ts" apps/web/types/next-auth.d.ts
git commit -m "feat(web): Auth.js config (OTP + dev Credentials, JWT sessions) + route handler"
```

---

## Task 9: Web — getApiToken() helper

**Files:**
- Create: `apps/web/lib/auth-token.ts`

- [ ] **Step 1: Create the helper**

Create `apps/web/lib/auth-token.ts`:

```ts
import 'server-only';
import { SignJWT } from 'jose';
import { auth } from '@/auth';

function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.API_JWT_SECRET ?? 'change-me-dev-only');
}

/**
 * Mint a short-lived API access token for the signed-in user (server-only).
 * Returns null when there is no session. The API verifies signature + iss/aud/exp.
 */
export async function getApiToken(): Promise<string | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer('spendlio-web')
    .setAudience('spendlio-api')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret());
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @spendlio/web typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/auth-token.ts
git commit -m "feat(web): getApiToken() — mint short-lived Bearer JWT from the session"
```

---

## Task 10: Web — swap the API client + assistant proxy to Bearer

**Files:**
- Modify: `apps/web/lib/api.ts`
- Modify: `apps/web/app/api/assistant/route.ts`
- Modify: `apps/web/lib/config.ts` (comment only)

- [ ] **Step 1: `lib/api.ts` — use the Bearer token**

In `apps/web/lib/api.ts`:

Change the import line:

```ts
import { API_BASE, DEMO_USER_ID } from './config';
```

to:

```ts
import { API_BASE } from './config';
import { getApiToken } from './auth-token';
```

Then replace the start of `request()` (the `fetch` call's headers). Replace:

```ts
  const { method = 'GET', body, schema, cache = 'no-store' } = options;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    cache,
    headers: {
      'content-type': 'application/json',
      'x-user-id': DEMO_USER_ID,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
```

with:

```ts
  const { method = 'GET', body, schema, cache = 'no-store' } = options;

  const token = await getApiToken();
  if (!token) throw new ApiError(401, 'Not authenticated');

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    cache,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
```

Also update the file's top doc comment: replace the sentence "it carries the dev `x-user-id` header, so it must never run in the browser" with "it mints a short-lived Bearer token from the Auth.js session, so it must never run in the browser".

- [ ] **Step 2: `app/api/assistant/route.ts` — use the Bearer token**

Replace the entire contents of `apps/web/app/api/assistant/route.ts` with:

```ts
import { API_BASE } from '@/lib/config';
import { getApiToken } from '@/lib/auth-token';

// Same-origin proxy for the assistant chat. The browser's useChat hook POSTs
// here; this handler runs server-side, attaches the signed-in user's Bearer
// token (so it never reaches the client), and streams the API's response back.
// Pointing useChat at a same-origin route also sidesteps CORS.

export async function POST(req: Request): Promise<Response> {
  const token = await getApiToken();
  if (!token) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.text();

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE}/assistant`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body,
    });
  } catch {
    // API not running yet — degrade gracefully so the chat page doesn't crash.
    return Response.json(
      { error: 'assistant_unavailable', message: 'The assistant is not reachable right now.' },
      { status: 503 },
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'text/plain; charset=utf-8',
    },
  });
}
```

- [ ] **Step 3: `lib/config.ts` — refresh the DEMO_USER_ID comment**

In `apps/web/lib/config.ts`, replace the `DEMO_USER_ID` doc comment:

```ts
/** Dev auth: the seeded demo user (also the AuthGuard default). Phase 5 swaps this for real auth. */
```

with:

```ts
/** Dev-login only: the seeded demo user the dev Credentials provider signs in as (ADR-033). */
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @spendlio/web typecheck`
Expected: PASS (no remaining references to `DEMO_USER_ID` in `api.ts`/assistant route).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/api.ts apps/web/app/api/assistant/route.ts apps/web/lib/config.ts
git commit -m "feat(web): send Bearer token (not x-user-id) from the API client + assistant proxy"
```

---

## Task 11: Web — route-protection middleware

**Files:**
- Create: `apps/web/middleware.ts`

- [ ] **Step 1: Create middleware**

Create `apps/web/middleware.ts`:

```ts
import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

// Edge middleware built from the providers-less config; it only reads the
// session cookie and runs the `authorized` callback to gate routes.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Everything except the Auth.js API, Next internals, and static assets.
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|logo-mark.svg).*)'],
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @spendlio/web typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/middleware.ts
git commit -m "feat(web): middleware redirects unauthenticated requests to /sign-in"
```

---

## Task 12: Web — sign-in feature (request action + two-step form + page)

**Files:**
- Create: `apps/web/features/auth/lib/actions.ts`
- Create: `apps/web/features/auth/components/sign-in-form.tsx`
- Create: `apps/web/app/sign-in/page.tsx`

- [ ] **Step 1: The request-OTP server action**

Create `apps/web/features/auth/lib/actions.ts`:

```ts
'use server';

import { API_BASE } from '@/lib/config';
import { OtpRequestInput, OtpRequestResult } from '@spendlio/contracts';

export interface RequestOtpResult {
  ok: boolean;
  error?: string;
  /** Dev-only echo of the code so you can complete the flow locally. */
  devCode?: string;
}

export async function requestOtpAction(email: string): Promise<RequestOtpResult> {
  const parsed = OtpRequestInput.safeParse({ email });
  if (!parsed.success) return { ok: false, error: 'Enter a valid email address.' };
  try {
    const res = await fetch(`${API_BASE}/auth/otp/request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: 'Could not send the code. Please try again.' };
    const body = OtpRequestResult.safeParse(await res.json());
    return { ok: true, devCode: body.success ? body.data.devCode : undefined };
  } catch {
    return { ok: false, error: 'Could not reach the server.' };
  }
}
```

- [ ] **Step 2: The two-step client form**

Create `apps/web/features/auth/components/sign-in-form.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@spendlio/ui';
import { requestOtpAction } from '../lib/actions';

export function SignInForm({ devEnabled }: { devEnabled: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setHint(null);
    const res = await requestOtpAction(email);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Something went wrong.');
      return;
    }
    setStep('code');
    if (res.devCode) setHint(`Dev code: ${res.devCode}`);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn('otp', { email, code, redirect: false });
    setBusy(false);
    if (res?.error) {
      setError('That code is incorrect or expired.');
      return;
    }
    router.push('/');
    router.refresh();
  }

  async function devLogin() {
    setBusy(true);
    setError(null);
    const res = await signIn('dev', { redirect: false });
    setBusy(false);
    if (res?.error) {
      setError('Dev login failed.');
      return;
    }
    router.push('/');
    router.refresh();
  }

  const label = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-strong)' } as const;
  const input = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-subtle)',
    fontSize: 15,
    fontFamily: 'var(--font-sans)',
    background: 'var(--surface-card)',
  } as const;

  return (
    <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.svg" width={32} height={32} alt="" />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--green-900)' }}>
          Spendlio
        </span>
      </div>

      {step === 'email' ? (
        <form onSubmit={sendCode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label htmlFor="email" style={label}>Email</label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={input}
            />
          </div>
          <Button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send code'}</Button>
        </form>
      ) : (
        <form onSubmit={verifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label htmlFor="code" style={label}>Enter the 6-digit code sent to {email}</label>
            <input
              id="code"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              style={{ ...input, letterSpacing: '0.3em', textAlign: 'center' }}
            />
          </div>
          <Button type="submit" disabled={busy}>{busy ? 'Verifying…' : 'Verify & sign in'}</Button>
          <button
            type="button"
            onClick={() => { setStep('email'); setCode(''); setError(null); setHint(null); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}
          >
            ← Use a different email
          </button>
        </form>
      )}

      {hint && <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{hint}</p>}
      {error && <p style={{ fontSize: 13, color: 'var(--red-700, #b91c1c)' }}>{error}</p>}

      {devEnabled && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
          <button
            type="button"
            onClick={devLogin}
            disabled={busy}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-subtle)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Dev: sign in as demo user
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: The sign-in route (thin server page)**

Create `apps/web/app/sign-in/page.tsx`:

```tsx
import { SignInForm } from '@/features/auth/components/sign-in-form';

// Bare page (the root layout renders no AppShell when there's no session).
export default function SignInPage() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background:
          'radial-gradient(700px 460px at 50% -5%, var(--green-50), transparent 70%), var(--surface-canvas)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <SignInForm devEnabled={process.env.NODE_ENV !== 'production'} />
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @spendlio/web typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/auth/ apps/web/app/sign-in/
git commit -m "feat(web): two-step email-OTP sign-in page + dev login"
```

---

## Task 13: Web — render AppShell only when signed in + a sign-out control

**Files:**
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/components/layout/app-shell.tsx`

- [ ] **Step 1: Gate the shell on the session in `layout.tsx`**

Replace the entire body of `apps/web/app/layout.tsx` below the font definitions. Replace these imports near the top:

```ts
import { getMe } from '@/lib/resources';
import { safe } from '@/lib/safe';
```

with:

```ts
import { auth } from '@/auth';
```

Then replace the `RootLayout` function:

```tsx
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
```

(`getMe`/`safe` are now unused in this file — removing their imports above is required.)

- [ ] **Step 2: Add a sign-out button to the shell**

In `apps/web/components/layout/app-shell.tsx`:

Add `LogOut` to the `lucide-react` import list (alongside `Menu`):

```ts
  Menu,
  LogOut,
```

Add `signOut` import from next-auth at the top (after the lucide import block / near the `@spendlio/ui` import):

```ts
import { signOut } from 'next-auth/react';
```

Then, inside the bottom group `<div style={{ marginTop: 'auto', ... }}>`, immediately AFTER the closing `</Link>` of the profile/settings link and BEFORE the closing `</div>` of that group, add:

```tsx
          <button
            type="button"
            onClick={() => signOut({ redirectTo: '/sign-in' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: 13,
              fontWeight: 'var(--weight-medium)',
              cursor: 'pointer',
              transition: 'var(--transition-colors)',
            }}
          >
            <LogOut size={16} strokeWidth={2} aria-hidden="true" />
            Sign out
          </button>
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @spendlio/web typecheck`
Expected: PASS.

- [ ] **Step 4: Build (first full integration check of the web)**

Run: `pnpm --filter @spendlio/web build`
Expected: SUCCESS. (If middleware/edge errors appear about next-auth, revisit Task 7 fallback notes.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/layout.tsx apps/web/components/layout/app-shell.tsx
git commit -m "feat(web): show AppShell only when signed in; add sign-out"
```

---

## Task 14: Update the live contract test (Bearer + 401 + OTP)

**Files:**
- Modify: `packages/contracts/src/api-contract.live.test.ts`

- [ ] **Step 1: Switch auth to a minted Bearer + add the new assertions**

In `packages/contracts/src/api-contract.live.test.ts`:

Add to the imports at the top:

```ts
import { SignJWT } from 'jose';
import { AuthUser } from './index';
```

Replace the constant:

```ts
const H = { 'x-user-id': '00000000-0000-0000-0000-000000000001' };
```

with:

```ts
const DEMO_ID = '00000000-0000-0000-0000-000000000001';
const apiSecret = new TextEncoder().encode(process.env.API_JWT_SECRET ?? 'change-me-dev-only');

async function bearer(sub = DEMO_ID): Promise<Record<string, string>> {
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuer('spendlio-web')
    .setAudience('spendlio-api')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(apiSecret);
  return { authorization: `Bearer ${jwt}` };
}
```

Change the `get()` helper to send the Bearer header. Replace:

```ts
async function get(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: H, signal: AbortSignal.timeout(2000) });
  return { status: res.status, body: res.status === 204 ? undefined : await res.json() };
}
```

with:

```ts
async function get(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: await bearer(), signal: AbortSignal.timeout(2000) });
  return { status: res.status, body: res.status === 204 ? undefined : await res.json() };
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(2000),
  });
  return { status: res.status, body: res.status === 204 ? undefined : await res.json().catch(() => undefined) };
}
```

- [ ] **Step 2: Add a dedicated auth test**

Add this test BELOW the existing `test('every web GET endpoint parses against its schema', ...)` block:

```ts
test('auth: rejects missing/invalid tokens; OTP endpoints behave', async () => {
  // Skip cleanly when the API isn't running.
  try {
    await fetch(`${BASE}/me`, { signal: AbortSignal.timeout(2000) });
  } catch {
    console.warn('[api-contract] API not reachable on :4000 — skipping auth check.');
    return;
  }

  // 401 with no token and with a garbage token.
  const noTok = await fetch(`${BASE}/me`, { signal: AbortSignal.timeout(2000) });
  expect(noTok.status).toBe(401);
  const badTok = await fetch(`${BASE}/me`, {
    headers: { authorization: 'Bearer not-a-jwt' },
    signal: AbortSignal.timeout(2000),
  });
  expect(badTok.status).toBe(401);

  // OTP request never enumerates (always 200) and verify rejects a wrong code.
  const reqRes = await post('/auth/otp/request', { email: 'demo@spendlio.app' });
  expect(reqRes.status).toBe(200);
  const wrong = await post('/auth/otp/verify', { email: 'demo@spendlio.app', code: '000000' });
  expect([400, 401]).toContain(wrong.status);

  // Happy-path roundtrip — only when not on cooldown (dev echoes the code).
  const devCode = (reqRes.body as { devCode?: string })?.devCode;
  if (devCode) {
    const ver = await post('/auth/otp/verify', { email: 'demo@spendlio.app', code: devCode });
    expect(ver.status).toBe(200);
    const u = AuthUser.safeParse(ver.body);
    expect(u.success).toBe(true);
    if (u.success) expect(u.data.id).toBe(DEMO_ID);
  }
}, 30000);
```

- [ ] **Step 3: Run the contracts tests (API down — must still pass via skip)**

Run: `pnpm --filter @spendlio/contracts test`
Expected: PASS (the live tests skip cleanly when `:4000` is unreachable; unit tests pass).

- [ ] **Step 4: Run the contracts tests against a LIVE stack (real integration)**

In one shell: `docker compose up -d`, then start the API (`pnpm --filter @spendlio/api dev`), then `pnpm --filter @spendlio/db seed`. In another shell:

Run: `pnpm --filter @spendlio/contracts test`
Expected: PASS — both the GET-schema test and the new auth test exercise the live API (401s, OTP request 200, wrong-code rejection, and the dev-code roundtrip returning the demo user).

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/api-contract.live.test.ts
git commit -m "test(contracts): live guard authenticates via Bearer JWT + covers 401/OTP paths"
```

---

## Task 15: Documentation — learning docs + build step

**Files:**
- Modify: `docs/learning/05-api-nestjs.md`
- Modify: `docs/learning/06-web-nextjs.md`
- Modify: `docs/learning/07-queues-jobs.md`
- Modify: `docs/learning/README.md`
- Modify: `docs/learning/glossary.md`
- Create: `docs/build/07-auth.md`

- [ ] **Step 1: `05-api-nestjs.md` — auth guard wiring**

Replace the final line:

```
*To document as we build each module: error format, auth guard wiring, pagination helper, the ZodPipe.*
```

with:

```
## Auth guard wiring

Auth is a **Bearer JWT** (ADR-033). The web mints a short-lived HS256 token (`{ sub: user_id, iss, aud, exp:+5m }`) from its Auth.js session and sends `Authorization: Bearer …`; the per-route `AuthGuard` (`common/auth.guard.ts`) verifies it with `jose` and sets `req.user = { id: sub }`, which `@CurrentUser()` exposes to controllers. There is **no global guard** — sign-in is public: the `auth/` module's `POST /auth/otp/{request,verify}` carry no `@UseGuards`. The OTP code lives in Redis (`@spendlio/queue`'s `getRedisClient()`); first verify provisions a `users` row by email. See `08-auth-security.md`.

*To document as we build each module: error format, pagination helper, the ZodPipe.*
```

- [ ] **Step 2: `06-web-nextjs.md` — web auth section**

Replace the bullet:

```
- Auth integration on the web (sessions) — see [`08-auth-security.md`](./08-auth-security.md).
```

with:

```
- Auth integration on the web — **done**, see the "Auth" section below.
```

Then add this section at the end of the file:

```
## Auth (Auth.js + email OTP)

Sign-in is **email OTP** via Auth.js (next-auth v5, JWT sessions, no DB adapter — ADR-033). The two-step `/sign-in` form (`features/auth/`) calls a `requestOtp` server action (→ API `POST /auth/otp/request`), then `signIn('otp', { email, code })` whose Credentials `authorize` verifies against the API. `middleware.ts` redirects unauthenticated requests to `/sign-in`. Each server request mints a short-lived Bearer JWT via `lib/auth-token.ts#getApiToken()` (used by `lib/api.ts` + the assistant proxy) — replacing the old dev `x-user-id`. A dev-only Credentials provider signs in as the seeded demo user locally so OTP email need not work in dev. The root layout renders the `AppShell` only when there's a session.
```

- [ ] **Step 3: `07-queues-jobs.md` — note OTP uses Redis**

Replace the parenthetical:

```
(We likely want Redis anyway for caching/sessions.)
```

with:

```
(We likely want Redis anyway for caching/sessions — and as of Phase 5 it also backs email-OTP codes via `getRedisClient()`; see ADR-033.)
```

- [ ] **Step 4: `README.md` (learning) — refresh the 08 one-liner**

Replace:

```
9. [`08-auth-security.md`](./08-auth-security.md) — auth model and how we keep each user's data isolated.
```

with:

```
9. [`08-auth-security.md`](./08-auth-security.md) — auth model (email OTP + JWT to the API, ADR-033) and how we keep each user's data isolated.
```

- [ ] **Step 5: `glossary.md` — add auth terms**

Add these bullets at the end of `docs/learning/glossary.md`:

```
- **OTP (one-time passcode):** a short numeric code, emailed to prove you own an address; single-use and short-lived. Spendlio uses a 6-digit code with a 10-minute TTL.
- **JWT (JSON Web Token):** a signed, self-describing token. Spendlio's web mints a short-lived one the API verifies to learn the user's id (ADR-033).
- **Bearer token:** a token sent in the `Authorization: Bearer <token>` header; whoever holds it is treated as authenticated, so it stays server-side.
- **Auth.js (NextAuth):** the web's session library — manages the sign-in flow and the session cookie. We run it with JWT sessions and no database adapter.
- **Session:** the record that "this browser is signed in as user X", kept in a cookie by Auth.js.
- **Magic-link:** an alternative passwordless sign-in where you click a link in the email instead of typing a code (we chose OTP).
- **Provisioning:** creating the app's `users` row on first sign-in, keyed on the verified email.
- **HMAC:** a keyed hash; Spendlio stores `HMAC(code)` (not the raw code) in Redis.
```

- [ ] **Step 6: Create the build step `docs/build/07-auth.md`**

Create `docs/build/07-auth.md`:

```
# 07 · Auth — email OTP + Auth.js + short-lived JWT (Phase 5)

> Decision: ADR-033. Full design: `../superpowers/specs/2026-06-16-phase-5-auth-otp-design.md`.
> Execution plan (task-by-task): `../superpowers/plans/2026-06-16-phase-5-auth-otp.md`.

## What this step delivers
Real authentication replacing the dev `x-user-id` header: email OTP sign-in on the web (Auth.js, JWT sessions), a short-lived Bearer JWT the API verifies, and first-sign-in provisioning. The architecture stays web → API → DB.

## Build order
1. `@spendlio/contracts`: OTP/auth Zod schemas (+ tests).
2. API: `EmailSender` (console dev sender) → `OtpService` (Redis + provisioning) → public `auth/otp` controller/module → rewrite `AuthGuard` to verify the JWT.
3. Web: install next-auth v5 + jose → Auth.js config (OTP + dev providers) + route handler → `getApiToken()` → swap `lib/api.ts` + assistant proxy to Bearer → middleware → sign-in feature → gate AppShell + sign-out.
4. Update the live contract test to authenticate via a minted Bearer JWT.

## Env
`AUTH_SECRET`, `AUTH_URL`, `API_JWT_SECRET` (shared web↔API), `EMAIL_FROM`, `REDIS_URL` (already present).

## Acceptance check
- `pnpm typecheck` · `pnpm --filter @spendlio/ui test` · `pnpm --filter @spendlio/contracts test` · `pnpm --filter @spendlio/web build` all green.
- With the stack up: visiting any route while signed out redirects to `/sign-in`; "Dev: sign in as demo user" lands on the dashboard with seeded data; the email-OTP flow (code printed in the API console) signs in a fresh user with empty data; `curl :4000/api/me` with no token returns 401.

## Deferred
Real prod email vendor, refresh tokens/mobile, OAuth, MFA, Postgres RLS — see `../learning/08-auth-security.md`.
```

- [ ] **Step 7: Commit**

```bash
git add docs/learning/05-api-nestjs.md docs/learning/06-web-nextjs.md docs/learning/07-queues-jobs.md docs/learning/README.md docs/learning/glossary.md docs/build/07-auth.md
git commit -m "docs(auth): document Phase 5 auth across learning docs + add build step 07"
```

---

## Task 16: Final verification + PROGRESS update

**Files:**
- Modify: `PROGRESS.md`

- [ ] **Step 1: Run the full acceptance gate**

Run each and confirm green:

```bash
pnpm typecheck
pnpm --filter @spendlio/ui test
pnpm --filter @spendlio/contracts test
pnpm --filter @spendlio/web build
```

Expected: all PASS. Fix any failures before continuing.

- [ ] **Step 2: Manual end-to-end acceptance (stack up)**

`docker compose up -d`; start API + web (`pnpm dev`); `pnpm --filter @spendlio/db seed`. Then verify:
- Visit `http://localhost:3000` signed out → redirected to `/sign-in`.
- Click **Dev: sign in as demo user** → dashboard renders with seeded demo data; the sidebar shows the demo profile; **Sign out** returns you to `/sign-in`.
- Enter a fresh email → **Send code** → read the code from the API console (or the on-screen dev hint) → **Verify** → you're signed in as a brand-new user with empty states.
- `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4000/api/me` → `401`.

- [ ] **Step 3: Tick Phase 5 in `PROGRESS.md`**

Replace the Phase 5 heading + checkbox:

```
## Phase 5 · Auth — ⏸ deferred (per user: prove the full app on the dev AuthGuard first; Auth.js is the final greenlight-able phase)
- [ ] Auth.js (web) + JWT to API; replace the dev `AuthGuard` (`x-user-id` header)
```

with:

```
## Phase 5 · Auth — ✅ done (2026-06-16) · email OTP via Auth.js + short-lived JWT to the API (ADR-033)
- [x] Auth.js (web, email OTP, JWT sessions) + short-lived Bearer JWT to the API; dev `AuthGuard` (`x-user-id`) removed
```

- [ ] **Step 4: Add a Build-Log row to `PROGRESS.md`**

In the Build-Log table (under the `| Date | Step / change | Notes ... |` header), add a new row at the top of the data rows:

```
| 2026-06-16 | Phase 5 · Auth — email OTP + Auth.js + JWT | Replaced the dev `x-user-id` trust path with real auth (**ADR-033**). Web: Auth.js (next-auth v5, JWT sessions, no adapter) with an **email-OTP** Credentials provider + a dev-only demo login; `middleware.ts` gates routes; `lib/auth-token.ts#getApiToken()` mints a short-lived **HS256 Bearer JWT** now sent by `lib/api.ts` + the assistant proxy. API: public `auth/otp/{request,verify}` (codes **HMAC'd in Redis** via `getRedisClient()`, 10-min TTL, 5 attempts, 60s cooldown, no enumeration), provision-by-email (**no migration**), and `AuthGuard` rewritten to verify the JWT (`jose`). Contracts: OTP/auth schemas; live test now authenticates via a minted Bearer + covers 401/OTP paths. Docs: ADR-033, `08-auth-security.md` locked, `05`/`06`/`07`/`glossary`/`README` updated, build step `07-auth.md`. Deferred: prod email vendor, refresh tokens/mobile, OAuth, MFA, RLS. |
```

- [ ] **Step 5: Commit**

```bash
git add PROGRESS.md
git commit -m "docs(progress): mark Phase 5 (auth) done + build-log row"
```

- [ ] **Step 6: Report**

Summarize what landed and confirm the acceptance gate is green. Do **not** push — the user pushes.

---

## Self-review notes (author)

- **Spec coverage:** every spec section maps to a task — contracts §5/§7 → T1; deps/env §12 → T2; email §7 → T3; OTP mechanics §6 + provisioning §8 → T4; API surface §5 → T5; guard §10 → T6; web §9 → T7–T13; live test §11 → T14; docs §17 → T15; acceptance §15 + PROGRESS → T16. Security §13 properties (no enumeration, HMAC, attempts/TTL/cooldown, constant-time, secret server-side, dev gating) are realized in T4/T6/T8/T12.
- **Type consistency:** schema names (`OtpRequestInput`, `OtpRequestResult`, `OtpVerifyInput`, `AuthUser`), the `EMAIL_SENDER` token + `EmailSender.sendOtpCode`, `OtpService.request/verify`, `getApiToken`, and the `iss:'spendlio-web'`/`aud:'spendlio-api'`/`API_JWT_SECRET` triple are used identically in web (mint) and API + live test (verify).
- **Known integration risk:** next-auth v5 ↔ Next 16 is gated by the Task 7 checkpoint with a documented fallback; the API Redis risk is resolved (`@spendlio/queue` already exposes `getRedisClient()` and the API already depends on it).
```

