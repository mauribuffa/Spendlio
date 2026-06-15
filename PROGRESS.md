# PROGRESS — Spendlio build tracker

> **Single source of truth for "where are we."** Claude Code updates this after **every** completed step: tick the box, set the status line, and add a Build-Log entry. Humans skim the top; details live in the log.

**Current status:** _Phase 1 · step 01 (monorepo skeleton) complete. Next: step 02 (Docker & env)._
**Last updated:** _2026-06-15_

---

## Phase 1 · Foundation
- [x] 01 · Monorepo skeleton (pnpm + Turborepo + `packages/config`) — `docs/build/01-monorepo-skeleton.md`
- [ ] 02 · Docker & env (Postgres + Redis + MinIO + `.env`) — `docs/build/02-docker-and-env.md`
- [ ] 03 · `@spendlio/contracts` (Zod) — `docs/build/03-contracts-package.md`
- [ ] 04 · `@spendlio/db` (Drizzle schema + migrations + seed) — `docs/build/04-db-package-drizzle.md`
- [ ] 05 · `@spendlio/core` (money + split engine + tests) — `docs/build/05-core-package.md`
- [ ] ✅ Phase 1 acceptance — `docs/build/99-acceptance.md`

## Phase 2 · API (NestJS)
- [ ] 06 · API foundation + `transactions` resource — `docs/build/06-api-nestjs.md`
- [ ] `budgets` resource (+ `GET /budgets/status` via core)
- [ ] `accounts` resource
- [ ] `categories` resource
- [ ] `splits` + `balances` (via core)
- [ ] `receipts` (presign upload; OCR enqueue stubbed until Phase 4)

## Phase 3 · Web (Next.js) — _build docs TBD_
- [ ] App Router skeleton + `@spendlio/ui` wired
- [ ] Overview, Transactions, Budgets, Split, Settings (compose `ui_kits/web` layouts)

## Phase 4 · Queue + workers + storage — _build docs TBD_
- [ ] `packages/queue` (BullMQ) + `packages/storage` (S3/MinIO)
- [ ] `apps/worker` (separate app) — ocr → categorize, recurring, recap, notify

## Phase 5 · Auth — _build docs TBD_
- [ ] Auth.js (web) + JWT to API; replace the dev `AuthGuard`

---

## Open decisions to resolve (from `docs/learning/decisions.md`)
- [ ] ADR-011 · AI/OCR provider + privacy posture (Phase 4)
- [ ] ADR-013 · final hosting target (at deploy)
- [ ] ADR-016 · FX rates provider + rounding rule (when building multi-currency totals)

---

## Build log
Newest first. One row per completed step or notable decision.

| Date | Step / change | Notes (what was done, anything surprising, ADRs added) |
|------|---------------|--------------------------------------------------------|
| 2026-06-15 | 01 · Monorepo skeleton | `git init` (branch `main`); root `package.json`/`pnpm-workspace.yaml`/`turbo.json`/`.gitignore`/`tsconfig.base.json` + `@spendlio/config` (shared eslint flat config). `pnpm install` ✓, `pnpm typecheck` ✓ (no-op, no packages yet). Deviation: pinned `packageManager` to `pnpm@10.33.4` (installed version) instead of doc's `pnpm@9.12.0` — reproducibility / avoid corepack mismatch. |
