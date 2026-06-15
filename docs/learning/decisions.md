# Decisions log (ADRs)

A running list of **Architecture Decision Records**. Each is a tiny, dated note: what we decided, why, and what we considered. New decisions append here as we build. Status: ✅ Decided · 🟡 Proposed (awaiting your confirm) · ⬜ Open.

Format: `ADR-NNN · status · title` — context → decision → alternatives.

---

### ADR-001 · ✅ · Monorepo with shared `contracts` + `core`
- **Context:** web, mobile, and API share domain shapes; they must not drift.
- **Decision:** one repo; `contracts` is the single source of truth for types; `core` holds framework-free domain logic; dependencies point inward.
- **Alternatives:** multi-repo + published packages (rejected: version-bump friction, drift).

### ADR-002 · ✅ · Next.js (web) + NestJS (api)
- **Decision:** `apps/web` = Next.js App Router; `apps/api` = NestJS (HTTP + queue workers in one app).
- **Why:** you specified these; both are strong, TS-first, well-documented.

### ADR-003 · ✅ · pnpm + Turborepo
- **Decision:** pnpm workspaces for linking, Turborepo for cached task running.
- **Alternatives:** npm/yarn workspaces (weaker); Nx (more powerful, heavier) — revisit if we outgrow Turbo.

### ADR-004 · ✅ · Zod-based contracts
- **Decision:** define shapes as Zod schemas, infer TS types, reuse the schema for runtime validation on both sides. (In *this* design-system repo the `contracts/` draft is import-free TS; Zod is added when lifted to `packages/contracts`.)
- **Alternatives:** plain TS interfaces (no runtime check); OpenAPI-first codegen (heavier).

### ADR-005 · ✅ · Money = integer minor units, never floats
- **Decision:** store/compute money as integer cents + a currency code; format only at the UI edge.
- **Open sub-decision (ADR-006):** DB column type.

### ADR-006 · ✅ · Money column = `bigint` integer cents
- **Decision:** store money as **integer minor units** in a `bigint` column + a currency code; all math in integer cents in `core`; format only at the UI edge. (Chose this over `numeric` + decimal lib for exact, simple integer math.)

### ADR-007 · ✅ · PostgreSQL + Drizzle
- **Decision:** Postgres; Drizzle ORM (typed, SQL-close, great for learning).
- **Alternatives:** Prisma (more magic, codegen); raw SQL (more boilerplate).

### ADR-008 · ✅ · BullMQ + Redis for the queue
- **Decision:** BullMQ on Redis for OCR, categorization, recurring, recap, notifications.
- **Alternatives:** `pg-boss` (Postgres-only, less infra) — reconsider if we want to avoid Redis.

### ADR-009 · ✅ · Auth.js + short-lived JWT to the API
- **Decision:** Auth.js (NextAuth) handles web sessions; the API trusts short-lived JWT access tokens (mobile uses the same token flow). We own the data and learn the mechanics.
- **Alternatives:** Clerk/Auth0 (hosted, faster, costs); custom Nest JWT (most work).

### ADR-010 · ✅ · REST from NestJS (no tRPC for now)
- **Decision:** plain REST resources from Nest, serving both web and mobile. A typed client wrapper for web can come later if wanted; no tRPC for now.

### ADR-011 · ✅ · AI/OCR providers & data posture
- **Decision:** all AI runs behind a provider interface in `@spendlio/ai` (see ADR-019). Default is a deterministic **offline engine** (rules-based categorization, mock OCR, grounded templated chat) — zero external calls, fully testable with no key. The **live** adapter uses the **Vercel AI SDK** (`ai` + `@ai-sdk/anthropic`/`@ai-sdk/openai`), provider-agnostic: Anthropic Claude (`claude-opus-4-8`) when `ANTHROPIC_API_KEY` is set; OpenAI when `AI_PROVIDER=openai` + `OPENAI_API_KEY`. Receipt OCR = multimodal LLM via `generateObject`, validated against the contracts receipt schema. **Privacy posture:** sensitive financial data only enters prompts on the live path the user explicitly enables (a key is set); the offline path keeps everything local. Model output is always re-validated against contracts before use (the model is untrusted input).
- **Alternatives considered:** binding directly to a single vendor SDK (rejected — no provider swap, weaker streaming/UI integration); dedicated OCR services (Textract / Document AI) — revisit if LLM OCR accuracy proves insufficient.

### ADR-012 · ✅ · Workers are a separate app (`apps/worker`); jobs split across packages
- **Decision:** workers run as their **own app** `apps/worker` (BullMQ consumers), importing `packages/{core,db,queue,storage,contracts}` and **nothing from `apps/api`**. Job name+payload schemas live in `packages/contracts`; the work in `packages/core`; queue wiring in `packages/queue`. Producers enqueue from `apps/api`.
- **Why:** the work lives in `core`, so the worker doesn't depend on the API — a separate app deploys/scales/fails independently (spiky OCR/AI load). Revised from an earlier "run-mode of apps/api" after review. Full reasoning in `07-queues-jobs.md`.

### ADR-013 · ✅ · Local infra in Docker; deploy as cheap as possible
- **Decision:** Postgres + Redis + MinIO run locally via one `docker-compose.yml` ($0 dev). For deploy we lean **free managed tiers** (Neon/Upstash/Cloudflare R2 + Vercel/Fly) or a **single ~$5/mo Hetzner VPS** running the same compose file. Final host picked at deploy time.
- **Why:** zero standing cost while learning; same env-var names local↔prod, only values change. See `10-local-dev-and-cost.md`.

### ADR-014 · ✅ · S3-compatible blob storage (MinIO local → R2/S3 prod)
- **Decision:** receipt images go to object storage behind a small `packages/storage` `BlobStore` interface; one S3-compatible implementation serves MinIO (local) and R2/S3 (prod). Uploads use pre-signed URLs (API never proxies bytes).
- **Why:** swap vendor by config, not code; R2 has zero egress fees.

### ADR-015 · ✅ · Learning docs go deeper (theory included)
- **Decision:** each topic gets concept + why + tradeoffs **and** a "Deep dive (theory)" section (e.g. DB indexing, BullMQ internals) as we build.

### ADR-016 · ✅ (model) / ⬜ (rates provider) · Multi-currency
- **Decision:** every amount stores its **original currency**; amounts are never raw-summed across currencies. **Two views:** native (per-account/-currency, exact, the "pesos/dollars tabs") and converted (the user's **base currency**, approximate, labeled "as of <date>"). Original amount+currency is the source of truth; transactions also store an **FX snapshot** to the base currency at entry time for stable historical totals. Minor-unit scale is **per-currency** (not always 2 decimals). Splits computed in the expense currency; balances tracked per currency.
- **Open:** rates provider (ECB/openexchangerates/…), refresh cadence, exact rounding rule.
- **Why / full model:** `12-currency-and-fx.md`.

### ADR-017 · ✅ (model) / 🟡 (tooling) · Internationalization
- **Decision:** i18n-ready from the start. `user.locale` and `user.timezone` are stored **separately from `defaultCurrency`** (locale ≠ currency). UI strings come from ICU message catalogs in the apps (not `contracts`/`core`); store category **keys**, translate labels in the UI; format numbers/dates/money via `Intl`; use logical CSS for RTL. Proposed tooling: `next-intl` (web), `i18next` (mobile).
- **Why / full guide:** `13-i18n.md`.

### ADR-018 · ✅ · `@spendlio/contracts` entity shapes authored from the table list
- **Context:** step 03 told us to port the design-system project's `contracts/src/*` shapes, but **those source files were not bundled into this repo**. Only `money/enums/common/transaction/jobs` were given verbatim in `docs/build/03-contracts-package.md`.
- **Decision:** authored the remaining entities (`user`, `account`, `category`, `budget`+`BudgetStatus`, `receipt`+`ReceiptLineItem`, `split`: `Person`/`Group`/`SplitShare`/`Split`/`Settlement`/`Balance`, `recap`: `MonthlySummary`/`CategorySpend`) from the table list in `03-database.md` + the `transaction.ts` template — minimal fields, consistent conventions (integer-cents money, `ownedEntity`/`baseEntity`, `Create*/Update*` DTOs). Specific choices: `user` carries `defaultCurrency` + separate `locale`/`timezone` (ADR-016/017); `category.userId` is nullable (null = built-in default); `Balance`/`BudgetStatus` are computed (not stored) and live in contracts; `CreateSplitInput` takes `participantIds`/`weights` and `core` computes the per-person `shares`; `receipt` stores an `imageKey` (storage key, not URL) + raw OCR payload. `recurring_rules` and `notifications` were intentionally deferred — not in step 03's file list; they arrive with their features.
- **Alternatives:** block and ask for every field (rejected: unproductive; shapes are easy to extend and the DB step will reconcile). These shapes are provisional and may be refined when `core` (step 05) and the API (step 06) firm up the split/budget contracts.

### ADR-019 · ✅ · AI work lives in `@spendlio/ai` (provider interface; offline default + AI-SDK live)
- **Context:** categorization, receipt OCR, and the assistant need an LLM SDK (Vercel AI SDK: `ai` + `@ai-sdk/anthropic`/`@ai-sdk/openai`). Golden Rule 1 forbids `core`/`contracts` importing any framework/SDK.
- **Decision:** all LLM-dependent work lives in a dedicated `@spendlio/ai` package behind an `LLMProvider` interface. The default is a deterministic **offline** engine (no key, no calls); the **live** adapter uses the AI SDK (Anthropic when `ANTHROPIC_API_KEY`; OpenAI when `AI_PROVIDER=openai` + `OPENAI_API_KEY`), model default `claude-opus-4-8`. The chat assistant is a **streaming request/response, not a queue job**: `streamChat()` → `toUIMessageStreamResponse()` is served by `apps/api` and consumed by the web `useChat` hook. The assistant's tools return exact integer cents — the model never does money math. Model output is re-validated against contracts before use. `@spendlio/ai` may depend on `core`/`db`; neither depends on `ai`. The worker imports `@spendlio/ai` for OCR/categorize/recap job work.
- **Alternatives:** binding directly to `@anthropic-ai/sdk` (rejected: vendor lock-in, no provider swap, weaker streaming/UI integration). Superseded the initial step-04 plan to use the official Anthropic SDK, at the user's request.

### ADR-020 · ✅ · `fx_rates` table shape & money-row FK policy
- **Context:** multi-currency needs historical, auditable rates (`12-currency-and-fx.md`) and money rows must never silently disappear (Golden Rule 7).
- **Decision:** (a) `fx_rates(base, quote, date, rate)` is **global** (no `user_id`); `rate` is an exact decimal **string** (`varchar 32`, never float) with `UNIQUE(base,quote,date)`; FX math runs in integer minor units in `core` (round half-up to the target minor unit). (b) Transactions snapshot FX inline (`fx_base_currency` / `fx_base_amount` cents / `fx_rate` string / `fx_as_of` YYYY-MM-DD), null when original == base, so historical totals never drift. (c) FK `onDelete`: `user_id` cascades; money/cross-entity FKs (account, payer, person, group) **restrict**; pure-join rows cascade. (d) Cyclic refs among transactions/splits/receipts/recurring are plain-uuid soft-FKs to avoid circular DDL.
- **Consequence:** rates are reproducible and exact; deleting a user cleans up their data while a referenced account/person/group cannot be hard-deleted out from under money rows.

### ADR-021 · ✅ · Split balances use the user-implicit viewpoint (model B)
- **Context:** `core.netForUser` needs a "me" id, but the schema has no `users`→`people` link / `is_me` flag, and the contracts `Balance` type treats the user as the implicit viewpoint with every `Person` a counterparty.
- **Decision:** `balancesSummary` scopes to splits owned by the user (`splits.user_id = userId`); the user is the implicit creditor; each `split_shares.personId` owes their amount; a **settled** settlement subtracts that amount from the person's debt; computed by direct per-person aggregation in exact integer cents. `splits.payerId` stays a required FK on insert but is unused by balance netting.
- **Consequence:** correct for the common "user paid" case (what the #10 proof + the live integration test exercise). Mixed-payer / "a friend paid me" splits (where the user owes) need a self-person row + bidirectional netting — **deferred follow-up**.

### ADR-022 · ✅ · AI live (AI-SDK) module is lazy-loaded, kept out of consumers' typecheck graph
- **Context:** `@spendlio/ai`'s barrel statically re-exported the live provider (`src/live`), which imports the Vercel AI SDK (`streamText`/`generateText`/`tool<…>` generics). Because consumers (`apps/api`, `apps/worker`) consume `@spendlio/ai` from TS source via tsconfig `paths`, importing the barrel dragged `src/live` into the consumer's tsc program — and `apps/api` `tsc --noEmit` **OOM-crashed** (SIGABRT, ~303s, >6 GB) instantiating the AI SDK generic surface. Runtime was unaffected (`ts-node` transpileOnly).
- **Decision:** the barrel and `config.ts` must NOT statically reference `./live` or `@ai-sdk/*`. `getProvider()` stays sync; when a key is set it returns a `LazyLiveProvider` proxy that loads the real provider via a runtime `import()` with a **non-literal specifier** (`const LIVE_MODULE='./index'`), which tsc types as `any` and does not follow — so consumers never instantiate the AI SDK types. Live-only env/model helpers live under `src/live/`. The package's own typecheck still checks `src/live` (kept type-safe); only consumers stop pulling it.
- **Consequence:** `apps/api typecheck` 303s+OOM → **1.76s**; `apps/worker` 2.35s; `@spendlio/ai` self green (21 tests). Runtime identical (offline default; live on key; streaming preserved). Rule for future AI-SDK code: keep it under `src/live/` and out of the barrel.

### ADR-023 · ✅ · Reconcile `@spendlio/ui` + web to the canonical Claude Design bundle
- **Context:** `@spendlio/ui` and `apps/web` were built clean-room from `DESIGN_REFERENCE.md` and drifted from the real design system. A Claude Design handoff bundle (the canonical tokens + components + web/mobile UI kits) was delivered and archived at `docs/design-bundle/`. Most consequential drift was **token vocabulary**: the repo used `--color-canvas/--color-primary/--font-body`, the canonical system uses a richer semantic layer (`--surface-*`, `--text-*`, `--border-*`, `--action-*`, full positive/negative/warning/info scales, `--shadow-brand`, `--transition-*`, px type scale).
- **Decision:** adopt the canonical token vocabulary **wholesale** — migrate every consumer (20 components + all web inline styles) and **drop** the old `--color-*` aliases (no back-compat translation layer). Components are reconciled in place (keep `spl-*` classes + `data-*` + repo APIs like integer-cents `MoneyAmount`); the bundle's prototype JSX is **translated** to React + `lucide-react`, matching visual output, not structure. Web chrome (248px sidebar, sticky blurred topbar), the kit pages (Overview/Transactions/Accounts/Budgets/Split/Assistant/Settings), a `Modal` + topbar Add-expense/Scan modals, and a presentational `/onboarding` flow were added/reskinned **presentation-only** — no data flow, server actions, contracts, DB, or endpoints changed. Mobile UI kit out of scope (no mobile app). Fonts stay self-hosted via `next/font` (no Google-Fonts `@import`). The prototype's dead search box and mock split/OCR/groups data were omitted rather than shipped as non-functional UI.
- **Consequence:** the app now renders on the real design system. `@spendlio/ui` 45 tests green; whole-repo typecheck + `next build` green. The canonical reference lives in-repo at `docs/design-bundle/`; spec at `docs/superpowers/specs/2026-06-15-design-system-reconciliation-design.md`. Supersedes the `DESIGN_REFERENCE.md` clean-room tokens.

### ADR-024 · ✅ · Explicit self-person for model-B split balances (ADR-021 follow-up)
- **Context:** split balances treat the **payer** of a split as "you" and drop it from the result (`SplitsService.balances`). With no `users→people` link, modeling "you paid, friends owe you" required either sacrificing a real friend as the payer (they vanish from balances) or fabricating one — and the seed/Add-expense flow both hit this. `CreateExpenseAction` worked around it by passing `payerId = participantIds[0]`, which silently drops that first friend's debt (catastrophic for the common single-friend split).
- **Decision:** add an explicit **self-person** — a `people` row with a new `is_self boolean` column (default `false`) representing the implicit "you". It is the payer/creditor viewpoint for model-B splits and is **excluded from `GET /people`** (`PeopleService.list` filters `is_self = false`) so it never pollutes people pickers, the People card, settle-up, or group membership. The seed creates one self-person per demo user and uses it as `payerId` (and a participant, so even-split remainder cents land correctly); friends then net out as debtors. Migration `0001` adds the column.
- **Scope / not done:** `SplitsService.create` and `createExpenseAction` were **not** changed — splits created through the Add-expense modal still pass `payerId = participantIds[0]` (pre-existing quirk). Fully routing user-created splits through the self-person (server-side payer override + `computeSplit` handling a payer outside `participantIds`) remains a follow-up. This ADR resolves the **balances/seed** correctness and the people-list pollution, not the modal's split-create path.
- **Alternatives:** a `users.self_person_id` FK (heavier, same effect); an `is_me` flag on `splits` instead of `people` (doesn't solve the payer-FK requirement). Supersedes the "deferred" disposition in ADR-021 for everything except the modal split-create path.

### ADR-025 · ✅ · Split Groups resource + synchronous per-person "Remind"
- **Context:** the canonical Split design (`docs/design-bundle/ui_kits/web/Split.jsx`) shows a **Groups** card (named groups of people with a net badge) and a per-person **Remind** action. The repo had `groups`/`group_members` tables and `Group`/`CreateGroupInput` contracts but no endpoint or reminder feature, so the Split page shipped People + balances + settle-up only.
- **Decision:** (a) a NestJS `groups` resource — `GET /groups` returns each group with its `memberIds`; `POST /groups` (validated by `CreateGroupInput`) creates a group + `group_members`, rejecting any member that isn't one of the user's own people. No new contract or DB change (both already existed). **Group net is derived in the web layer** by summing the current balances of a group's members — not stored, not a new endpoint (per-group attribution via `splits.groupId` is available but unused for now; documented in the page). (b) **Remind** is a synchronous `POST /people/:id/remind` that records an in-app `settle_reminder` **notification** for the user referencing the person — reusing the existing `notifications` table (the same `settle_reminder` type the notify worker already knew). It is a direct user action, so it runs in-request rather than as a queue job (precedent: the streaming assistant, ADR-019). We have **no email/push transport** yet; actual delivery to the person lands when that infra exists.
- **Alternatives:** enqueue a `notify` job (rejected: its id-only `{userId,type}` payload can't reference a person and its deterministic jobId would dedupe all reminders into one); a no-op toast (rejected: leaves no record). Computing group net server-side in `core` (deferred: the web already holds balances; YAGNI).

### ADR-026 · ✅ · Content-addressed receipt uploads (client SHA-256 + dedup + integrity)
- **Context:** receipt bytes upload **directly** to object storage via a presigned PUT — the API never sees them (ADR-014). The flow used a random per-upload key with no dedup and no integrity check; re-uploading the same receipt created a new row and a fresh (paid) OCR call, and nothing verified the stored object matched what the client intended.
- **Decision:** the client computes a **SHA-256** of the file (Web Crypto, `crypto.subtle.digest`) before upload — the only place that can hash, since bytes never reach our server. The hash flows through the existing 3-step flow without changing response shapes: (1) `presign(contentType, sha256)` derives a **content-addressed key** `receipts/<userId>/<sha256>.<ext>` (keys stay **per-user** so identical content across users never collides — no cross-user dedup/privacy signal); (2) browser PUTs to it; (3) `register({ imageKey, sha256 })` **dedups** — if the user already has a live receipt with that hash it returns the existing row and skips the OCR enqueue. The **worker re-hashes** the fetched bytes and refuses to OCR on mismatch (the client-asserted hash is untrusted until the one component that sees the bytes verifies it). `sha256` is stored on the `receipts` row (migration `0002`, nullable for legacy rows) with a non-unique `(userId, sha256)` lookup index. The `ocr` job payload stays id-only (`{ receiptId }`, Golden Rule 5).
- **Deliberately deferred:** a generic `files` table — only receipts use storage today, so the `receipts` row *is* the file record (YAGNI). Revisit when a second uploader exists (avatars, statement imports, mobile). A **partial-unique** index `(userId, sha256) WHERE deleted_at IS NULL` for hard duplicate prevention under concurrent registers — the service-level dedup SELECT covers the single-user case, and duplicate rows would be harmless anyway (same content-addressed key). 
- **Verified live:** content-addressed key, dedup (same hash → same receipt id, no re-OCR), and integrity (a mismatched hash fails the job) all confirmed against the seeded stack.

### ADR-027 · ✅ · Receipt review & approve → expense (human-in-the-loop money)
- **Context:** OCR is best-effort and especially fragile across locales — ARS receipts print `1.500,00` (dot=thousands, comma=decimals), so the model can emit the wrong scale ("wrong quantity of zeros"). Auto-committing OCR money is therefore unsafe, and there was no path from a receipt to a transaction anyway (the "create from receipt" action was omitted for lack of an endpoint).
- **Decision:** OCR output is a **suggestion the user verifies and corrects before it becomes money**. After upload the web routes to `/receipts/<id>`; once `parsed && !transactionId` the page shows an **editable review form** (merchant, date, total, currency, add/remove/edit line items with an "auto-sum to total" affordance, required category). **Approve** → new **`POST /receipts/:id/confirm`** (validated by `ConfirmReceiptInput`) writes the corrected values back to the receipt **and** creates the linked expense (`amount = -total`, `source:'ocr'`, `receiptId`), setting `receipt.transactionId`. Re-confirming is rejected (400). **State model:** no enum change — `transactionId != null` means "converted"; the page then shows a "Added to expenses ✓ → view in transactions" panel. **Money scaling:** the review form takes human MAJOR units and the server action converts to integer minor units via **per-currency `toMinorUnits(major, currency)`** (ARS=2, JPY/CLP=0, BHD=3) — replacing the hardcoded `×100` for this path.
- **Deferred / noted:** ~~the pre-existing hardcoded `×100` in the other manual-entry actions~~ — ✅ fixed (all of `createTransactionAction`/`createExpenseAction`/`settleUpAction` now use per-currency `toMinorUnits`). AI-suggested category pre-fill (manual pick for v1). A per-transaction detail route (link to the `/transactions` list for now). The Add-expense modal is still USD-only (no currency picker), so its client-side `×100` is correct there.
- **Verified live:** parsed receipt → confirm created `-150000` ARS (=$1,500.00) groceries expense linked to the receipt; re-confirm → 400; `toMinorUnits` scales ARS/JPY/USD/BHD correctly. Spec: `docs/superpowers/specs/2026-06-15-receipt-review-approve-design.md`.

---

## Open questions parked for you
1. **AI/OCR providers + privacy posture** (ADR-011) — pick when we build the OCR/AI features.
2. **Final hosting target** (ADR-013) — free managed tiers vs a ~$5/mo VPS; decide at deploy time.
3. **FX rates provider + rounding rule** (ADR-016) — pick when we build multi-currency totals.

Everything else is decided ✅ — see the ADRs above.
