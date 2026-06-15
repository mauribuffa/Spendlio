# PROGRESS — Spendlio build tracker

> **Single source of truth for "where are we."** Claude Code updates this after **every** completed step: tick the box, set the status line, and add a Build-Log entry. Humans skim the top; details live in the log.

**Current status:** _Phases 1–4 COMPLETE and PROVEN END-TO-END. Full stack runs live: web (Next.js + `@spendlio/ui`) → API (NestJS) → Postgres + Redis + MinIO, with `apps/worker` (BullMQ) and the AI assistant (offline default / Vercel AI SDK live). Built by a 4-specialist agent team. Phase 5 (Auth.js) intentionally deferred on the dev AuthGuard. 82 unit/integration tests green + a live e2e gate (create→categorize→split→balances→receipt→ocr→recap→AI chat) + a web render smoke; whole monorepo typecheck + lint green; committed + merged to main._
**Last updated:** _2026-06-15_

---

## Phase 1 · Foundation
- [x] 01 · Monorepo skeleton (pnpm + Turborepo + `packages/config`) — `docs/build/01-monorepo-skeleton.md`
- [x] 02 · Docker & env (Postgres + Redis + MinIO + `.env`) — `docs/build/02-docker-and-env.md`
- [x] 03 · `@spendlio/contracts` (Zod) — `docs/build/03-contracts-package.md`
- [x] 04 · `@spendlio/db` (Drizzle schema + migrations + seed) — `docs/build/04-db-package-drizzle.md` — 16 tables, migration applied, 12 categories + demo user seeded
- [x] 05 · `@spendlio/core` (money + split engine + tests) — `docs/build/05-core-package.md` — 24 tests; every split sums exactly
- [x] ✅ Phase 1 acceptance — `docs/build/99-acceptance.md` — verified by integration gate (migrate + seed + typecheck + core tests)

## Phase 2 · API (NestJS) — ✅ complete (`apps/api`, proven end-to-end)
- [x] 06 · API foundation + `transactions` resource — `docs/build/06-api-nestjs.md`
- [x] `budgets` resource (+ `GET /budgets/status` via core)
- [x] `accounts` resource
- [x] `categories` resource
- [x] `splits` + `balances` (via core)
- [x] `receipts` (presign → MinIO upload; enqueues `ocr`)
- [x] `assistant` (POST `/assistant`, streamed) + `/me`, `/people`, `/recaps/:month`

## Phase 3 · Web (Next.js) — ✅ complete (`apps/web`, renders live API data)
- [x] App Router skeleton + `@spendlio/ui` wired (`styles.css` + 3 fonts via `next/font`)
- [x] Overview, Transactions, Budgets, Split, Insights (+Assistant chat), Settings — all render live data; `next build` green

## Phase 4 · Queue + workers + storage — ✅ complete
- [x] `packages/queue` (BullMQ, typed `enqueue`, idempotent hyphen jobIds) + `packages/storage` (S3/MinIO `BlobStore`, presigned PUT)
- [x] `apps/worker` (separate app) — ocr → categorize, recurring, recap, notify (live-proven, idempotent)
- [x] `@spendlio/ai` — provider interface (offline default + Vercel AI SDK live), categorization, OCR, streaming tool-calling assistant

## Phase 5 · Auth — ⏸ deferred (per user: prove the full app on the dev AuthGuard first; Auth.js is the final greenlight-able phase)
- [ ] Auth.js (web) + JWT to API; replace the dev `AuthGuard` (`x-user-id` header)

---

## Open decisions to resolve (from `docs/learning/decisions.md`)
- [x] ADR-011 · AI/OCR provider + privacy posture — ✅ RESOLVED (Vercel AI SDK; offline default + Anthropic/OpenAI live; see ADR-019)
- [ ] ADR-013 · final hosting target (at deploy)
- [ ] ADR-016 · FX rates provider + rounding rule (when building multi-currency totals)

## Follow-ups (tracked, non-blocking — runtime is proven)
- [ ] #11 · Lift recap/recurring pure math into `@spendlio/core` (ADR-012)
- [x] #12 · ✅ DONE — `@spendlio/ai` live module lazy-loaded behind a non-literal dynamic import; `apps/api tsc --noEmit` 303s+OOM → **1.76s** clean (ADR-022). Runtime unchanged.
- [ ] Optional: real dead-letter queue + alerting; `pgvector` for semantic search (neither needed today)

---

## Build log
Newest first. One row per completed step or notable decision.

| Date | Step / change | Notes (what was done, anything surprising, ADRs added) |
|------|---------------|--------------------------------------------------------|
| 2026-06-15 | Plan 03 · Monthly Recap page (Slice C, web-only) | Dedicated `/recap` server page parameterised by `?month=` (defaults to current month, no redirect/`[month]` route); month picker (`Select`) navigates by query; income/expense/net `Stat`s + per-category `CategoryIcon`+`ProgressBar` share-of-total + top merchant; `EmptyState` when recap not built (404) and warn `Notice` when API down (both collapse to `data===null` via `safe`). Insights left intact (assistant lives there). Recap sidebar entry. **Surprise:** plan's verbatim `const [y,m]=month.split('-').map(Number)` fails web's `noUncheckedIndexedAccess` (TS18048) — fixed with destructuring defaults `[y=0,m=1]` in both `recap-utils.ts` and `MonthPicker.tsx`. Per surgical policy, no web vitest (pure helpers typecheck-covered). web typecheck 0. |
| 2026-06-15 | Plan 02 · Receipts page (Slice B, web-only) | `/receipts` list + `/receipts/[id]` detail (server components, `revalidate=0`); status `Badge`; client `PollWhileProcessing` (router.refresh while any receipt is `processing` — no client data fetch); upload dance presign → browser `PUT` (`uploadToPresignedUrl`) → register, split client/server so `x-user-id` never leaves the server; server actions + `revalidatePath`; resources `listReceipts`/`getReceipt`/`presignReceipt`/`registerReceipt` (parsed vs `ReceiptSchema`/local `PresignedUpload`); Receipts nav entry. **"Create transaction from receipt" intentionally omitted** — no backend route exists (documented inline). Per surgical test-runner policy, **no apps/web vitest config added** — the pure PUT helper is covered by typecheck + manual smoke (plan's documented fallback). web typecheck 0. |
| 2026-06-15 | Plan 01 · Accounts page + `GET /accounts/balances` | New `AccountBalanceSchema` (contracts) + pure FX/sum math in `packages/core/accounts.ts` (`sumNet`/`pickRate`/`convertMinor`, minor-units, latest-rate either-orientation, null when no pair) — **10 new core tests + 3 contract tests green**. NestJS `AccountsService.balances(userId)` + `@Get('balances')` route (declared before `:id`); both user-owned reads scoped by `user_id`, `fxRates` global. Web: `getAccountBalances()` resource (parsed vs contract), `/accounts` server page + `'use client'` `AccountsTabs` (currency tabs; "All" shows base-converted rollup, "—" when no rate), Accounts nav link. typecheck 0 across contracts/core/api/web. Account-currency assumption per INDEX (sum raw amounts per account; no per-txn reconversion). |
| 2026-06-15 | Plan 00 · `@spendlio/ui` completion | Restored the (working-tree-deleted) package from HEAD, then added 8 components → **20 total**: IconButton, Tag, Select, Switch, Checkbox, AmountInput, EmptyState, Skeleton (+SkeletonRow). Each: `.tsx` + co-located test + `.spl-*` block in `styles.css` + barrel export; all repo-vocabulary tokens. `pnpm --filter @spendlio/ui test` **39 passed** (11 files), typecheck 0; `pnpm --filter web typecheck` 0 (web resolves all UI imports). Two plan-verbatim type bugs fixed: `Tag.color` and `EmptyState.title` collided with the HTML-attribute base — kept the prop names via `Omit<…, 'color'>` / `Omit<…, 'title'>`. Subagent-driven (1 implementer per component, sequential on shared `styles.css`/`index.ts`). |
| 2026-06-15 | ✅ Build complete + committed to main | Full monorepo green: `pnpm -r typecheck` ✅, `pnpm -r test` ✅ **82 passed** (contracts 3 / core 24 / queue 4 / storage 7 / ui 23 / ai 21), `pnpm lint` ✅. Runtime proven (e2e gate + web render smoke). Landed via logical commits merged `--no-ff` to main. Remaining = deferred (Auth.js / deploy / FX rates) + optional secondary endpoints (settlements / recurring / notifications + their UI writes) + app-level test suites. |
| 2026-06-15 | #12 · API typecheck fix | `@spendlio/ai` barrel/config no longer statically reference `./live`/`@ai-sdk`; live provider lazy-loads via a non-literal dynamic import (`LazyLiveProvider`). `apps/api tsc --noEmit` 303s→OOM-crash ⇒ **1.76s clean**; worker 2.35s; ai self 21 tests; offline `/assistant` still streams exact "$55.50". ADR-022. |
| 2026-06-15 | ✅ #10 · End-to-end proof | Booted api+worker+web on live Postgres/Redis/MinIO. Verified the full path: create txn → **categorize** job (transfer→dining) → `/budgets/status` → **split** (even 3000→1500/1500) → **balances** → **receipt** presign→MinIO PUT→**ocr** job (parsed) → **recap** → **AI assistant streamed "You spent $55.50 on dining in June"** (tool-calling, exact integer cents, `useChat` format). Web renders live data ($42.00/$6.75/dining, $15.00 balance) across all 6 pages; `/api/assistant` proxy 200. Float amount→400; user-isolation enforced; soft-delete hides rows. |
| 2026-06-15 | `apps/web` (Next.js) | App Router, 9 routes, `@spendlio/ui` + 3 fonts; server components/actions (Zod); `/api/assistant` proxy → `useChat`. typecheck + `next build` green; renders live API data. |
| 2026-06-15 | `apps/worker` (BullMQ) | Separate app: ocr→categorize chain, recurring (cron sweep), recap (monthly_summaries), notify. Idempotent (deterministic hyphen jobIds), 3-attempt backoff, failed-set retention (DLQ-equivalent). Live-proven. |
| 2026-06-15 | `apps/api` (NestJS) | All resources + streamed `/assistant` + `/me` / `/people` / `/recaps`. CommonJS via `ts-node`+`tsconfig-paths` (esbuild/tsx can't emit decorator metadata). Zod-validated, `user_id`-scoped, dev AuthGuard. Curl + e2e proven. `tsc --noEmit` is fast + clean (**1.76s**) after #12 fixed the AI-SDK typecheck OOM. ADR-011/019/022. |
| 2026-06-15 | Wave 2 · `packages/storage` + `packages/queue` | architect: `BlobStore` interface + S3 impl (MinIO local ↔ R2/S3 prod by env, presigned PUT, API never proxies bytes); BullMQ connection + typed `enqueue()` over the `QUEUES` registry + `createWorker` factory. typecheck + tests green vs live MinIO/Redis. **ADR-020**. |
| 2026-06-15 | `@spendlio/ai` (AI layer) | Vercel AI SDK, provider-agnostic: deterministic **OfflineProvider** default (no key, no calls) + live Anthropic/OpenAI adapter gated on env; rules-first categorizer, vision OCR via `generateObject`, streaming tool-calling chat (`streamChat`→web `useChat`). 7 tests green. **ADR-011/ADR-019**. Switched from `@anthropic-ai/sdk` per user request (provider-swap + UI streaming). |
| 2026-06-15 | `@spendlio/ui` (design system) | Clean-room from `DESIGN_REFERENCE.md` tokens: `styles.css` full token set + 12 token-driven components (Button, MoneyAmount, TransactionRow, CategoryIcon × 12 keys, ProgressBar, Stat, Toast, …). typecheck + 23 tests green. |
| 2026-06-15 | 05 · `@spendlio/core` | money re-exports + split engine (even/exact/percent, deterministic leftover cent) + balances `netForUser`. 24 tests; property verified: every split sums EXACTLY to total for n = 1..20. |
| 2026-06-15 | 04 · `@spendlio/db` | 16 Drizzle tables (incl. `fx_rates`), migration `0000` applied, idempotent seed = 12 categories + demo user `00000000-0000-0000-0000-000000000001`. typecheck green. **ADR-020**. |
| 2026-06-15 | Team setup | Spawned a 4-specialist agent team (architect/backend/ux/ai). Lead manages installs centrally (fixed a zsh-glob bug that silently dropped runtime deps) + runs an integration gate per wave. API runs CommonJS via `ts-node` + `tsconfig-paths` (esbuild/`tsx` can't emit NestJS decorator metadata). |
| 2026-06-15 | 03 · `@spendlio/contracts` | Zod schemas + `z.infer` types + `Create/Update` DTOs for user, account, category, transaction, budget (+`BudgetStatus`), receipt (+`ReceiptLineItem`), split (Person/Group/SplitShare/Split/Settlement/Balance), recap (MonthlySummary/CategorySpend); `money`/`enums`/`common`/`jobs` (`QUEUES` + payloads). typecheck ✓; 3 vitest tests ✓ (valid parse, float-amount rejected, money helpers). **ADR-018** added: entity shapes were authored from the table list — design-system `contracts/src/` drafts weren't bundled. `recurring_rules`/`notifications` deferred (not in step 03 file list). |
| 2026-06-15 | 02 · Docker & env | `docker-compose.yml` (Postgres 16 + Redis 7 + MinIO + one-shot `minio-setup` for the `receipts` bucket), `.env.example`, git-ignored `.env`. `docker compose up -d` ✓; Postgres healthy + `spendlio` db reachable, Redis `PONG`, MinIO `receipts` bucket created (setup exit 0), console HTTP 200 on :9001. |
| 2026-06-15 | 01 · Monorepo skeleton | `git init` (branch `main`); root `package.json`/`pnpm-workspace.yaml`/`turbo.json`/`.gitignore`/`tsconfig.base.json` + `@spendlio/config` (shared eslint flat config). `pnpm install` ✓, `pnpm typecheck` ✓ (no-op, no packages yet). Deviation: pinned `packageManager` to `pnpm@10.33.4` (installed version) instead of doc's `pnpm@9.12.0` — reproducibility / avoid corepack mismatch. |
