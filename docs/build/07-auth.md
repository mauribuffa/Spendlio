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
