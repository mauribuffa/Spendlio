# 08 · Auth & security

> ⬜ The biggest open decision. This file frames the choices; we lock it before building auth.

## What we must guarantee

Spendlio holds people's financial data. Two hard requirements:
1. **Authentication** — we know who the request is from.
2. **Authorization / isolation** — a user can only ever see *their own* data (and shared splits they're part of).

## The isolation rule (applies no matter which auth we pick)

Every user-owned row has a `user_id`. **Every query filters by the authenticated user's id** — enforced in the service layer, ideally also with a database safeguard (row-level security). There is no code path that reads a transaction without scoping it to its owner. This single rule prevents the most common and most damaging class of bug in multi-tenant apps.

## ⬜ Auth options

| Option | What it is | Trade |
|---|---|---|
| **Auth.js (NextAuth)** | sessions in Next.js; pass a token to the API | great web DX, you own the data; more wiring for a separate API + mobile |
| **Clerk / Auth0 (hosted)** | managed auth provider | fastest to ship, handles MFA/social/passkeys; a dependency + cost |
| **Custom (Nest + JWT)** | issue/verify your own JWTs | full control, most work, you own all the security edge-cases |

**My lean:** for a learning project that also wants real product quality, **Auth.js on web + short-lived JWT access tokens to the API** (mobile uses the same token flow) teaches you the mechanics without hand-rolling password storage. If you'd rather move fast, **Clerk** removes almost all of it. Decide in [`decisions.md`](./decisions.md).

## Things we'll document when we build it
- Token lifetime + refresh strategy.
- How the mobile app stores tokens (secure storage).
- Password hashing (argon2) **only if** we self-host credentials.
- Rate limiting on auth endpoints.
- Row-level security policies in Postgres as a backstop.

## General security hygiene (house rules)
- Secrets in env vars / a secrets manager — never in the repo.
- Validate every input at the edge (`contracts` + ZodPipe) — also a security control.
- Money mutations are audited (who/when) via `created_at`/actor fields.
- Least-privilege DB credentials for the app vs. migrations.
