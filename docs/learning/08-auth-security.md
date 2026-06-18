# 08 · Auth & security

> ✅ **Decided** (Phase 5, ADR-033): **email OTP** via Auth.js + a short-lived JWT to the API. This file keeps the framing (what we must guarantee, the options we weighed) and now records the mechanics we chose. Full design: [`../superpowers/specs/2026-06-16-phase-5-auth-otp-design.md`](../superpowers/specs/2026-06-16-phase-5-auth-otp-design.md).

## What we must guarantee

Spendlio holds people's financial data. Two hard requirements:
1. **Authentication** — we know who the request is from.
2. **Authorization / isolation** — a user can only ever see *their own* data (and shared splits they're part of).

## The isolation rule (applies no matter which auth we pick)

Every user-owned row has a `user_id`. **Every query filters by the authenticated user's id** — enforced in the service layer, ideally also with a database safeguard (row-level security). There is no code path that reads a transaction without scoping it to its owner. This single rule prevents the most common and most damaging class of bug in multi-tenant apps.

## Auth options (the choice we weighed)

| Option | What it is | Trade |
|---|---|---|
| **Auth.js (NextAuth)** | sessions in Next.js; pass a token to the API | great web DX, you own the data; more wiring for a separate API + mobile |
| **Clerk / Auth0 (hosted)** | managed auth provider | fastest to ship, handles MFA/social/passkeys; a dependency + cost |
| **Custom (Nest + JWT)** | issue/verify your own JWTs | full control, most work, you own all the security edge-cases |

**Decision (ADR-033):** **Auth.js on web + short-lived JWT access tokens to the API** — the middle option. Within it we picked **email OTP** (passwordless, so there's no password storage to hand-roll) over magic-link (which would force a DB adapter). Clerk/Auth0 were rejected to keep ownership of the data; custom Nest+JWT was rejected as needless work. The mechanics are below.

## The mechanics we chose (ADR-033)

- **Sign-in:** email **OTP** — a 6-digit code. No passwords, so no password hashing to own. Magic-link was rejected because Auth.js's native email provider needs a DB adapter (the web would then write the DB).
- **Sessions:** Auth.js (next-auth v5), **JWT strategy, no DB adapter** — no `accounts`/`sessions`/`verification_tokens` tables.
- **API trust:** the web **mints a short-lived HS256 JWT per request** (`jose`, `{ sub: user_id, iss, aud, exp:+5m }`, shared `API_JWT_SECRET`) from the Auth.js session and sends it as `Authorization: Bearer`; the API verifies signature + claims → `req.user.id`. Re-minting per render means **no web refresh tokens**.
- **OTP authority = the API:** public `POST /api/auth/otp/{request,verify}`. Codes are **HMAC-hashed in Redis** with a 10-min TTL, **5 attempts**, **single-use**, **60s resend cooldown**, and **no email enumeration** (`/request` always returns 200).
- **Provisioning:** first verify **upserts `users` by `email`** (already unique) — no migration, no adapter tables. The seeded demo user maps to itself.
- **Email:** an **`EmailSender` interface** (house rule: target interfaces, not vendors); dev logs the code to the console; **real delivery is a vendor-neutral SMTP sender (ADR-036)** — `SmtpEmailSender` (nodemailer), selected when `SMTP_HOST` is set, local dev catches mail in a **Mailpit** container, prod just supplies `SMTP_*` creds (SES/Mailgun/Resend-SMTP). Local dev also has a **dev-only Credentials provider** that signs in as the seeded demo user, so OTP email need not work locally.

## Deferred (revisit when needed)
- Refresh tokens + how the mobile app stores them (secure storage).
- OAuth providers (Google/GitHub) — purely additive on top of OTP.
- MFA; per-IP rate limiting on `/request`; OTP email as a queue job.
- RS256/JWKS instead of the shared HS256 secret.
- Row-level security policies in Postgres as a defense-in-depth backstop.
- Account self-management (change email / delete account).
- Password hashing (argon2) — **not needed** unless we ever add a credentials provider.

## General security hygiene (house rules)
- Secrets in env vars / a secrets manager — never in the repo.
- Validate every input at the edge (`contracts` + ZodPipe) — also a security control.
- Money mutations are audited (who/when) via `created_at`/actor fields.
- Least-privilege DB credentials for the app vs. migrations.
