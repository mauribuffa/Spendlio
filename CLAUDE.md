# CLAUDE.md — Spendlio

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Place this file at the **root of the Spendlio monorepo**. Claude Code loads it automatically as project context. Keep it current as the project evolves.

## Current state (read this first)
The **Repo structure** section below describes the target layout, and as of the last update the repo now matches it: all three apps (`apps/web`, `apps/api`, `apps/worker`) and all eight packages (`contracts`, `core`, `db`, `queue`, `storage`, `ui`, `ai`, `config`) exist. Phases 1–4 are complete and proven end-to-end; **Phase 5 (Auth.js) is intentionally deferred** — the API still runs on a dev `AuthGuard` that trusts an `x-user-id` header. **`PROGRESS.md` is the single source of truth for what's built and what's deferred**; check it before assuming current behavior. Work proceeds step-by-step through `docs/build/` (in order); run each step's acceptance check, then tick `PROGRESS.md`.

## What Spendlio is
A personal-finance + expense-splitting product: track spending/income, budgets, split bills with people, settle debts, scan receipts (OCR), AI categorization, an AI assistant over your data, recurring transactions, and monthly recaps. Two clients (web now, mobile later), one API, one database, background workers.

## Decided stack (do not change without an ADR)
- **Monorepo:** pnpm workspaces + Turborepo
- **Web:** Next.js (App Router) — `apps/web`
- **API + workers:** NestJS — `apps/api` (one app, two run-modes: HTTP and worker)
- **Shared packages:** `contracts` (Zod), `core` (pure domain logic), `db` (Drizzle), `queue` (BullMQ), `storage` (S3-compatible), `ui` (design system = `@spendlio/ui`), `config`
- **Database:** PostgreSQL + Drizzle ORM
- **Queue:** BullMQ on Redis
- **Auth:** Auth.js (web) + short-lived JWT to the API
- **API style:** REST
- **Local infra:** Docker Compose (Postgres + Redis + MinIO) — $0
- **Language:** TypeScript everywhere, `strict: true`

Open (don't block the foundation): AI/OCR provider + privacy posture; final hosting target. Decide via an ADR when you reach them.

## Repo structure
```
apps/web              Next.js app (consumes @spendlio/ui + contracts)
apps/api              NestJS HTTP server (producers enqueue jobs)
apps/worker           BullMQ consumers — separate app; imports core/db/queue, NOT apps/api
packages/contracts    Zod schemas + inferred types + DTOs + job payloads  (source of truth)
packages/core         pure domain logic (money math, split/settlement, job work)
packages/db           Drizzle schema + migrations + client + seed
packages/queue        BullMQ connection + typed enqueue() + QUEUES registry
packages/storage      BlobStore interface (S3-compatible: MinIO/R2/S3)
packages/ui           the design system (tokens + React components)
packages/config       shared ESLint config (the base tsconfig is tsconfig.base.json at the repo root; Prettier runs on defaults)
docs/                 learning/ (the why) + build/ (step-by-step) ; decisions.md ADR log
PROGRESS.md           build tracker — update after every completed step (status + checkbox + log)
docker-compose.yml    Postgres + Redis + MinIO
```

## Golden rules (non-negotiable)
1. **Dependencies point inward toward `contracts`.** `contracts` and `core` import **no** framework, **no** DB driver, **no** React. If you're tempted to import `@nestjs/*` or `pg` into `core`, the code belongs in `apps/api`.
2. **Money is integer minor units (cents), never a float.** Store as `bigint`, compute in integer cents in `core`, format with `Intl.NumberFormat` only at the UI edge. A money value is `{ amount: number /* cents */, currency: string }`.
3. **Validate every API input** with a Zod schema from `contracts` before it touches a service.
4. **Every user-owned row has `user_id` and every query filters by it.** No code path reads user data unscoped.
5. **Workers are their own app (`apps/worker`), not part of `apps/api`.** A job's name + payload is a `contracts` schema; the work it performs lives in `core`; queue wiring is `packages/queue`. `apps/worker` imports `core/db/queue/contracts` and nothing from `apps/api`, so it deploys/scales/fails independently. Jobs are **idempotent** and carry **id-only** payloads.
6. **Target interfaces, not vendors** (storage, queue) so local↔prod is a config swap (MinIO↔R2/S3).
7. **Each table has `id` (uuid), `created_at`, `updated_at` (timestamptz).** Soft-delete (`deleted_at`) where history matters.

## Naming & conventions
- Contracts: `XSchema` + `type X` for entities; `CreateXInput` / `UpdateXInput` for write DTOs.
- DB: snake_case columns, camelCase in TS (Drizzle maps). Index every `user_id` and foreign key.
- Packages are named `@spendlio/<name>`; import via the alias, never relative cross-package paths.
- Commit messages: conventional commits. Migrations are committed and never edited after shipping — add a new one.

## Front-end structure & styling (`apps/web`) — see ADR-031/032
- **Three layers.** `packages/ui` = app-agnostic visual primitives (reusable by the future mobile client). `apps/web/components/` = shared cross-feature WEB composites (`layout/`, `form/`, `domain/`, `feedback/`). `apps/web/features/<domain>/{components,hooks,lib}` = domain-specific UI + server actions + feature utils. `apps/web/app/` is **routing only** — thin `page.tsx` files that compose a feature view. Rule of thumb: primitive → `packages/ui`; web composite → `components/`; domain → `features/<domain>`.
- **Styling is token-driven inline styles** (`style={{}}` with `var(--token)`). The **only** things that go in CSS (`@spendlio/ui/styles.css`) are what inline style can't express: pseudo-states and **layout/breakpoints**. Use the `.spl-*` layout utilities (`spl-cards`, `spl-grid-asym`, `spl-form-row`, `spl-stack`, `spl-cluster`, `spl-only-mobile/desktop`) via `cn()`; pass per-instance values as inline CSS vars (`style={{ '--spl-cols': '1fr 1.7fr' }}`). Breakpoint is **768px** (`--bp-md`). No Tailwind, no CSS Modules. Render responsive swaps in CSS (both variants + `display`), not a JS `useMediaQuery`.
- **Component filenames are kebab-case** (e.g. `button.tsx`, `add-transaction-form.tsx`); exported symbols stay PascalCase. (Enforcement via an `unicorn/filename-case` lint rule is deferred until the packages actually run ESLint — none currently have a `lint` script, so the rule would be inert today.)

## Commands
```
pnpm install
docker compose up -d         # Postgres + Redis + MinIO
pnpm dev                     # turbo: web + api in watch
pnpm typecheck | lint | test
pnpm db:generate             # create a Drizzle migration from schema
pnpm db:migrate              # apply migrations
pnpm db:seed                 # default categories + demo user

# Per-package (faster than full turbo run):
pnpm --filter @spendlio/contracts test       # one package's tests
pnpm --filter @spendlio/contracts test -- src/contracts.test.ts   # one file
pnpm --filter @spendlio/contracts test -- -t "rejects float"      # one test by name (vitest)
```

Tests use **Vitest**. Packages are consumed straight from TypeScript source (`main`/`types` → `src/index.ts`), so there is no build step for libraries — `typecheck`/`test` run against source directly.

## How to work
1. Read `docs/build/` and follow the steps **in order**; run each step's acceptance check before moving on.
2. **After every completed step, update `PROGRESS.md`** — tick the box, set the status line + date, and add a Build-Log row. It is the single source of truth for where we are.
3. `docs/learning/` explains the *why* — consult it when a decision isn't obvious. `docs/learning/decisions.md` is the ADR log; **append a new ADR for any non-trivial decision.**
3. The design system (`packages/ui`) is the visual source of truth — reuse its components and tokens; don't re-style from scratch. See `DESIGN_REFERENCE.md`.
4. Prefer small, pure functions in `core` with unit tests; keep controllers/services thin.
5. Don't introduce a new dependency or pattern that contradicts the Golden Rules without an ADR.
