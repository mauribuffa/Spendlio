# Phase 5 — Authentication: Email OTP (Auth.js) + short-lived JWT to the API

- **Status:** ✅ design approved (2026-06-16) — implementation not started
- **Refines:** ADR-009 (Auth.js + short-lived JWT to the API). This spec fixes the open variables ADR-009 left: the provider (**email OTP**), the token mechanics, and first-sign-in provisioning. Recorded as **ADR-033**.
- **Golden rules touched:** #3 (validate every input with a `contracts` Zod schema), #4 (every user-owned row scoped by the *authenticated* `user_id`), #6 (target interfaces, not vendors — for email).

## 1. Context & current state

There is **no real authentication today**. The API's dev `AuthGuard`
(`apps/api/src/common/auth.guard.ts`) trusts an `x-user-id` request header and
falls back to the seeded demo UUID; the web attaches that header server-side
(`apps/web/lib/api.ts` + the assistant proxy `apps/web/app/api/assistant/route.ts`)
using `DEMO_USER_ID`. This is the last blocker before real users or any deploy.

What is **already correct and must not regress**:

- Every API service scopes its queries `WHERE user_id = …` (golden rule #4 is
  honored across all 12 resource controllers). We only change **where
  `req.user.id` comes from**, not the scoping itself.
- The guard is applied **per-route** via `@UseGuards(AuthGuard)` (no global
  `APP_GUARD`), so new **public** auth endpoints simply omit the guard.
- The web fetches all data **server-side** (`'server-only'` modules), so the
  identity credential never reaches the browser. There are exactly **two**
  server-side injection points to change.
- `users.email` is **already `UNIQUE`** — usable as the provisioning key with
  **no migration**. No Auth.js adapter tables exist (and we are not adding any).

## 2. Locked decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Sign-in mechanism | **Email OTP** (6-digit code), not magic-link |
| 2 | Session library | **Auth.js (next-auth v5)** on web, **JWT session strategy**, **no DB adapter** |
| 3 | Web→API credential | Web **mints** a short-lived **HS256 JWT** per server request; API **verifies** it |
| 4 | OTP authority | The **API** owns OTP request/verify + storage + provisioning |
| 5 | OTP storage | **Redis** key with TTL (no migration) |
| 6 | Email delivery | **`EmailSender` interface**; dev = console log; prod vendor **deferred** to its own ADR |
| 7 | Local dev login | A **dev Credentials provider** (gated `NODE_ENV !== 'production'`) logs in as the seeded demo user |
| 8 | Provisioning | **Upsert `users` by `email`** on first verify — **no migration** |
| 9 | JWT/crypto lib | **`jose`** on both web and API (symmetric, edge-compatible, minimal deps) |
| 10 | Shared secret | **`API_JWT_SECRET`** (web mints / API + live-test verify); Auth.js uses its own `AUTH_SECRET` |

OTP parameters (sane defaults): **6 digits**, **10-min TTL**, **5 attempts** then
invalidate, **single-use** (deleted on success), **60s resend cooldown**. Access
token **TTL 5 min** with `iss: 'spendlio-web'`, `aud: 'spendlio-api'`.

## 3. Architecture — the token model

The architecture stays **web → API → DB**; the web never touches the DB.

```
Browser ──(cookie session, Auth.js)──▶ Next.js server
                                         │  getApiToken(): read Auth.js session,
                                         │  mint HS256 JWT { sub: user_id, iss, aud, exp:+5m }
                                         ▼
                                   Authorization: Bearer <jwt>
                                         │
                                         ▼
                                   NestJS API  ── AuthGuard: jose.jwtVerify
                                                   (sig + iss + aud + exp) → req.user={id:sub}
                                                   → existing WHERE user_id = … scoping
```

- The web re-mints from the long-lived Auth.js session on **every render**, so
  there is **no refresh-token machinery on web** (deferred to mobile).
- The Bearer token is created in `'server-only'` code and travels server→server;
  it never reaches the browser — the same security property the current
  `x-user-id` has.
- The API is a **verifier + OTP authority + provisioner**, not a token issuer.
  The web is the token issuer (matches ADR-009's "the API trusts short-lived JWT
  access tokens").

## 4. Sign-in flow (email OTP)

```
[1] /sign-in → enter email
      → server action requestOtp(email)
        → POST /api/auth/otp/request { email }
          API: generate 6-digit code; store HMAC(code) in Redis (EX 600);
               enforce 60s resend cooldown; EmailSender.sendOtpCode(email, code);
               ALWAYS return 200 (no email enumeration).
[2] enter code
      → signIn('otp', { email, code })           (Auth.js Credentials provider)
        → authorize() → POST /api/auth/otp/verify { email, code }
          API: load Redis code; check not-expired + attempts≤5 + constant-time match;
               on success → upsert users by email (PROVISIONING) → delete the key
               → return { id, email, name };  on failure → 401 (increment attempts).
      → Auth.js establishes a JWT session holding user_id.
[3+] every server request → getApiToken() mints Bearer JWT → API verifies.
```

**Dev login:** a second Auth.js Credentials provider (`id: 'dev'`, only registered
when `NODE_ENV !== 'production'`) returns the seeded demo user directly (no email,
no OTP). This is the normal local loop; OTP email never needs to work locally.

## 5. API surface & contracts

New **public** `AuthController` (no `@UseGuards`):

| Method | Route | Body (Zod from `contracts`) | Returns |
|---|---|---|---|
| `POST` | `/api/auth/otp/request` | `OtpRequestInput` `{ email }` | `204`/`200` (always; no enumeration) |
| `POST` | `/api/auth/otp/verify` | `OtpVerifyInput` `{ email, code }` | `AuthUser` `{ id, email, name }` on success, `401` otherwise |

New `packages/contracts/src/auth.ts` (framework-free Zod), exported from the barrel:

```ts
export const OtpRequestInput = z.object({ email: z.string().email() });
export type OtpRequestInput = z.infer<typeof OtpRequestInput>;

export const OtpVerifyInput = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});
export type OtpVerifyInput = z.infer<typeof OtpVerifyInput>;

export const AuthUser = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
});
export type AuthUser = z.infer<typeof AuthUser>;
```

Both endpoints validate the body with the existing `ZodPipe` (golden rule #3).

## 6. OTP mechanics (Redis)

- **Key** `otp:<email-lowercased>` → JSON `{ codeHash, attempts }`, set with
  `EX 600` (Redis TTL is the expiry — no manual clock math).
  `codeHash = HMAC-SHA256(code, API_JWT_SECRET)` (a casual Redis read cannot
  reveal the code to re-email it; the real protection is attempt-limit + TTL +
  single-use — documented as such).
- **Cooldown key** `otp:cooldown:<email>` → `EX 60`; `/request` short-circuits
  (still returns 200) if present.
- **Verify:** `GETDEL`-style read; if absent → fail. Compare in constant time.
  On mismatch increment `attempts`; at >5 delete the key. On success delete the
  key (single-use).
- **Redis client:** reuse the connection the API already uses for BullMQ
  producers (`@spendlio/queue`); add a thin `ioredis` client only if that
  connection isn't exposed. *(Implementation note: confirm the API's existing
  Redis access during the plan.)*

## 7. Email sender (interface; vendor deferred — golden rule #6)

```ts
export interface EmailSender { sendOtpCode(to: string, code: string): Promise<void>; }
```

- Bound via a NestJS DI token (`EMAIL_SENDER`).
- **Dev:** `ConsoleEmailSender` logs `OTP for <email>: 123456` to the API console.
- **Prod vendor** (Resend / SMTP / SES) is a separate ADR when the hosting
  target is decided (parked open question #2 in `decisions.md`). Sent **inline**
  in the request for now; moving it onto the BullMQ queue is a later hardening.

## 8. Provisioning

First successful verify **upserts a `users` row keyed on `email`**
(`onConflictDoNothing` / select-then-insert), taking `name` from the verified
profile and leaving `defaultCurrency`/`locale`/`timezone` at their schema
defaults. **No migration** — no new columns, no adapter tables. The seeded demo
user (`demo@spendlio.app`) maps to itself.

## 9. Web changes (`apps/web`)

- **`auth.ts`** (new): Auth.js config — `session.strategy = 'jwt'`; providers
  `Credentials({ id: 'otp', authorize })` + (dev-only) `Credentials({ id: 'dev' })`;
  `jwt`/`session` callbacks persist & expose `user.id`. Exports `{ handlers, auth, signIn, signOut }`.
- **`app/api/auth/[...nextauth]/route.ts`** (new): mounts Auth.js handlers.
- **`middleware.ts`** (new): protect everything except `/sign-in` + `/api/auth/*`;
  redirect unauthenticated → `/sign-in`. *(Implementation note: use the Auth.js
  edge/split-config pattern so middleware stays edge-safe — the Credentials
  `authorize` that calls `fetch` lives in the node-side config.)*
- **`features/auth/`** (new): the two-step sign-in UI (client) + `requestOtp`
  server action + a "Sign in as demo" button (dev).
- **`app/sign-in/page.tsx`** (new): thin route composing the feature view.
- **`lib/auth-token.ts`** (new): `getApiToken()` — read session via `auth()`,
  mint HS256 JWT with `jose`.
- **`lib/api.ts`** (edit): replace the `x-user-id` header with
  `Authorization: Bearer ${await getApiToken()}`.
- **`app/api/assistant/route.ts`** (edit): same Bearer swap.
- **`lib/config.ts`** (edit): keep `DEMO_USER_ID` (now dev-login only); document
  the new secrets.
- **`app/layout.tsx`** (edit): a sign-out control; `getMe()` returns the
  authenticated user.
- **`package.json`** (edit): add `next-auth` (v5) + `jose`.
  *(Implementation risk: confirm next-auth v5 compatibility with Next 16 /
  React 19 during the plan.)*

## 10. API changes (`apps/api`)

- **`src/common/auth.guard.ts`** (edit): extract Bearer token; `jose.jwtVerify`
  with `API_JWT_SECRET`, checking `iss`/`aud`/`exp`; set `req.user = { id: sub }`;
  throw `UnauthorizedException` on missing/invalid. **The `x-user-id` trust path
  is removed entirely** (the dev *login* now lives in Auth.js, not a forgeable
  header).
- **`src/auth/`** (new): `auth.module.ts`, `auth.controller.ts` (otp request /
  verify), `otp.service.ts` (Redis + provisioning), `email/` (`EmailSender`
  interface + `ConsoleEmailSender`).
- **`src/app.module.ts`** (edit): register `AuthModule`.
- **`package.json`** (edit): add `jose` (+ `ioredis` only if the queue connection
  isn't reusable).

## 11. Contracts & the live contract test

- New `auth.ts` schemas (§5), exported from `packages/contracts/src/index.ts`.
- **`api-contract.live.test.ts`** (edit): replace the `x-user-id` header with a
  Bearer JWT minted for the demo user (`sub = 00000000-0000-0000-0000-000000000001`,
  `iss`/`aud` set) using `API_JWT_SECRET` (default `change-me-dev-only`, matching
  `.env.example`) — via `jose` (a library, not a framework, so contracts stays
  framework-free). The skip-when-API-down behavior is preserved.

## 12. Config / env (`.env.example`)

- `API_JWT_SECRET` — shared HS256 secret (web mints; API + live test verify).
  Supersedes the unused `JWT_SECRET` placeholder.
- `AUTH_SECRET` — Auth.js session secret (already present).
- `AUTH_URL` — e.g. `http://localhost:3000` (Auth.js base URL).
- `EMAIL_FROM` — sender identity (used by the prod adapter later).
- `REDIS_URL` — already present (now also backs OTP).

## 13. Security

No email enumeration (`/request` always 200); HMAC'd, single-use codes; attempt +
TTL + cooldown limits; constant-time compare; the shared secret lives only in
server-side code; the dev provider is gated to non-prod; the `x-user-id` trust
path is deleted. **Deferred** hardening: per-IP rate limiting on `/request`,
moving OTP email to the queue, RS256/JWKS instead of a shared HS256 secret.

## 14. Explicitly deferred

Refresh tokens / mobile secure-storage; OAuth providers (purely additive later);
MFA; Postgres RLS backstop; concrete prod email vendor; OTP email as a queue job;
account self-management (change email / delete). These are noted in the ADR and
in `08-auth-security.md` so they aren't lost.

## 15. Acceptance & verification

- `pnpm typecheck` — green.
- `pnpm --filter @spendlio/ui test` — green.
- `pnpm --filter @spendlio/contracts test` — green (live test skips when API
  down; verifies via Bearer JWT when up).
- `pnpm --filter @spendlio/web build` — green.
- Manual: dev-login → demo data renders; OTP sign-in (code from API console) →
  provisions a fresh user who sees only their own (empty) data; API returns
  **401** to requests with a missing/invalid Bearer; `x-user-id` is no longer
  honored.

## 16. Files touched (map)

**Create:** `apps/web/auth.ts`, `apps/web/middleware.ts`,
`apps/web/app/api/auth/[...nextauth]/route.ts`, `apps/web/app/sign-in/page.tsx`,
`apps/web/features/auth/**`, `apps/web/lib/auth-token.ts`, `apps/api/src/auth/**`,
`packages/contracts/src/auth.ts`, `docs/build/07-auth.md`.
**Edit:** `apps/web/lib/api.ts`, `apps/web/app/api/assistant/route.ts`,
`apps/web/lib/config.ts`, `apps/web/app/layout.tsx`, `apps/web/package.json`,
`apps/api/src/common/auth.guard.ts`, `apps/api/src/app.module.ts`,
`apps/api/package.json`, `packages/contracts/src/index.ts`,
`packages/contracts/src/api-contract.live.test.ts`,
`packages/contracts/package.json`, `.env.example`.

## 17. Documentation deliverables (so none are forgotten)

Done **now** (decision-level, pre-implementation):

- [x] This spec.
- [x] **ADR-033** in `docs/learning/decisions.md` (refines ADR-009).
- [x] **`08-auth-security.md`** — flipped ⬜→✅, documented the OTP/Auth.js/JWT
  design, filled "the mechanics we chose" + a deferred list.

Done **with the implementation** (so they describe real code):

- [ ] `05-api-nestjs.md` — "auth guard wiring" subsection (JWT verify + the
  public `auth/` OTP module).
- [ ] `06-web-nextjs.md` — resolve the ⬜ "Auth integration on the web (sessions)"
  (Auth.js OTP, `getApiToken`, middleware).
- [ ] `07-queues-jobs.md` — one line noting Redis now also backs OTP (the doc
  already anticipated "Redis anyway for caching/sessions").
- [ ] `glossary.md` — add: OTP, JWT, Bearer token, Auth.js (NextAuth), session,
  magic-link, provisioning, HMAC.
- [ ] `README.md` (learning) — refresh the `08` one-liner if its scope changed.
- [ ] `docs/build/07-auth.md` — the step-by-step build guide (project convention).
- [ ] `PROGRESS.md` — tick Phase 5 + add a Build-Log row (after the step passes).

## 18. Open implementation risks (resolve in the plan)

1. **next-auth v5 ↔ Next 16 / React 19** compatibility — verify the version; have
   a fallback (pin a known-good version, or a minimal hand-rolled cookie session)
   if it doesn't cooperate.
2. **API Redis access** — confirm the API already holds a Redis connection via
   `@spendlio/queue` (it enqueues jobs) before adding a new `ioredis` client.
3. **Auth.js edge middleware** — Credentials `authorize` uses `fetch`; keep the
   split edge/node config so middleware stays edge-safe.
