# Real OTP email via SMTP — design

**Date:** 2026-06-17
**Status:** Approved (brainstorming) → implementation
**ADR:** ADR-036
**Tracker item:** PROGRESS.md "Next up · A) Real email delivery for OTP"

## Problem

Phase 5 auth (ADR-033) ships an email-OTP sign-in, but the only `EmailSender`
implementation is `ConsoleEmailSender`, which logs the code to the API console.
A real user never receives a code. We need real delivery while keeping the
vendor-neutral seam the codebase already established.

## Decision summary

Add one new `EmailSender` implementation, `SmtpEmailSender` (built on
`nodemailer`), selected at DI time when `SMTP_HOST` is present — mirroring the
repo's existing "offline default / live-gated-on-env" pattern (`@spendlio/ai`).
Local dev gets a **Mailpit** container so the SMTP path runs and is verifiable
end to end ("$0 local infra", golden rule #6: target interfaces, not vendors —
prod swaps SMTP creds to SES / Mailgun / Resend-SMTP with no code change).

## Components

### 1. `apps/api/src/auth/email/smtp-email-sender.ts` (new)
`SmtpEmailSender implements EmailSender`.
- Constructs a `nodemailer` transport from env at instantiation:
  `host = SMTP_HOST`, `port = Number(SMTP_PORT ?? 587)`,
  `secure = SMTP_SECURE === 'true'`, and **optional** auth — include
  `{ auth: { user, pass } }` only when both `SMTP_USER` and `SMTP_PASS` are set
  (Mailpit needs none).
- Bounded timeouts so `request()` can never hang on a dead SMTP host:
  `connectionTimeout`, `greetingTimeout`, `socketTimeout` ≈ 10s.
- `sendOtpCode(to, code)` sends:
  - `from`: `EMAIL_FROM` (already declared in `.env.example`).
  - `subject`: `Your Spendlio code`.
  - `text`: plain-text body with the 6-digit code + "expires in 10 minutes".
  - `html`: minimal inline-styled body (no templating engine — YAGNI).
- Must not throw on success (interface contract). On transport failure it
  rejects; the caller (`OtpService`) handles cleanup.

### 2. `apps/api/src/auth/auth.module.ts` (edit)
Replace the `EMAIL_SENDER` provider `useClass: ConsoleEmailSender` with a
`useFactory`:
- `process.env.SMTP_HOST` present → `new SmtpEmailSender()`
- else → `new ConsoleEmailSender()`
Log once at startup which transport is active (`Logger('EmailSender')`), so the
selection is observable.

### 3. `apps/api/src/auth/otp.service.ts` (edit — failure path only)
Current `request()` stores the code + a 60s cooldown, then sends. `Console`
can't fail; a real SMTP send can. Wrap the send:
- On failure: **delete both the code key and the cooldown key** (so the user can
  retry immediately with a fresh code) and throw
  `ServiceUnavailableException('Could not send your code. Please try again.')`.
- This does not leak account existence — a transport error is unrelated to
  whether the email exists — so it preserves the no-enumeration property.
- Success path, cooldown no-op path, and the non-prod `devCode` return are
  unchanged.

### 4. `docker-compose.yml` (edit)
Add a `mailpit` service:
```yaml
mailpit:
  image: axllent/mailpit
  ports: ["1025:1025", "8025:8025"]   # 1025 SMTP, 8025 web inbox
```
No volume (ephemeral catch is fine for dev).

### 5. `apps/api/package.json` (edit)
Add `nodemailer` (dependency) + `@types/nodemailer` (devDependency).
Verify it resolves after `pnpm install` (scaffolded deps have been missed
before — recalled gotcha).

### 6. `.env.example` (edit)
Add, near the existing `EMAIL_FROM`:
```
SMTP_HOST=localhost      # local: Mailpit (docker compose). Unset -> console transport.
SMTP_PORT=1025           # Mailpit SMTP. Prod: 587 (STARTTLS) / 465 (TLS).
SMTP_USER=               # set in prod (SES/Mailgun/Resend-SMTP); Mailpit needs none
SMTP_PASS=
SMTP_SECURE=false        # true for port 465
```
Mailpit becomes the default local transport (a fresh `docker compose up -d` +
`pnpm dev` sends real SMTP, readable at http://localhost:8025). Prod = swap
creds; unset `SMTP_HOST` to fall back to console.

## Data flow

```
POST /auth/otp/request
  -> OtpService.request(email)
       redis SET otp:<email> {codeHash, attempts}, EX 600
       redis SET otp:cooldown:<email>, EX 60
       EMAIL_SENDER.sendOtpCode(email, code)
            SMTP_HOST set?  -> SmtpEmailSender -> nodemailer -> Mailpit/SES/...
            else            -> ConsoleEmailSender -> API log
       on send failure: redis DEL both keys; throw 503
  -> 200 { ok: true, devCode? }   (devCode only in non-prod)
```

## Error handling

| Case | Behavior |
|------|----------|
| SMTP host unreachable / send rejects | DEL code+cooldown keys, throw 503; immediate retry allowed |
| `SMTP_HOST` unset | `ConsoleEmailSender` (no failure surface) |
| Resend within 60s cooldown | unchanged: silent no-op, returns `{}` |
| Send hangs | bounded by nodemailer 10s timeouts -> rejects -> 503 path |

## Testing / verification

`apps/api` has **no test runner** by a locked surgical decision (PROGRESS log
2026-06-15); auth/queue changes are verified by typecheck + live, not unit
tests. We follow that:

1. `pnpm --filter @spendlio/api typecheck` — green.
2. `docker compose up -d` — Mailpit reachable at `:8025`.
3. With `SMTP_HOST=localhost`: `POST /auth/otp/request` -> the OTP email lands in
   the Mailpit inbox with the correct code; `POST /auth/otp/verify` with that
   code -> 200 + provisioned user.
4. Unset `SMTP_HOST` -> falls back to `ConsoleEmailSender` (code prints to log).
5. Failure path: point `SMTP_HOST` at a dead port -> `request()` returns 503 and
   an immediate retry is accepted (cooldown was cleared).

## Scope guards (YAGNI)

- No React Email / templating engine — inline strings.
- No send queue / async retry — synchronous send; the failure path covers
  transient errors via user retry. (OTP volume is trivial.)
- No provider-specific SDK code — pure SMTP keeps it vendor-neutral.
- No new env-validation framework — read `process.env` in the factory/sender,
  matching `otp.service.ts`.

## Docs to update on completion

- `docs/learning/decisions.md` — ADR-036.
- `PROGRESS.md` — tick "Next up · A", add a Build-Log row.
- `docs/build/07-auth.md` — note the SMTP transport + Mailpit.
- `.env.example` — the SMTP block above.
