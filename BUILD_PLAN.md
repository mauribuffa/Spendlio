# Build plan — Spendlio

Execute in order. Each phase has **steps**, the **files** to create, and **acceptance** checks. Phase 1 is the foundation the user asked to scaffold first; later phases are outlined.

> Conventions are non-negotiable: money = integer cents; deps point inward to `contracts`; `contracts`/`core` import no framework/DB/React. See `docs/learning/`.

---

## Phase 0 · Prerequisites
- Node 20+, **pnpm** (`corepack enable && corepack prepare pnpm@latest --activate`), **Docker** + Docker Compose.
- `git init`.

---

## Phase 1 · Foundation (monorepo + contracts + db + local infra)

> **Full, copy-ready file contents for every step below are in [`docs/build/`](./docs/build/README.md)** (01–05 + acceptance). This section is the map; `docs/build/` is the detail.

### 1.1 Monorepo skeleton
Create:

`package.json` (root)
```json
{
  "name": "spendlio",
  "private": true,
  "packageManager": "pnpm@9",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint",
    "db:generate": "pnpm --filter @spendlio/db generate",
    "db:migrate": "pnpm --filter @spendlio/db migrate",
    "db:seed": "pnpm --filter @spendlio/db seed"
  },
  "devDependencies": { "turbo": "^2", "typescript": "^5" }
}
```

`pnpm-workspace.yaml`
```yaml
packages: ["apps/*", "packages/*"]
```

`turbo.json`
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "dev": { "cache": false, "persistent": true },
    "typecheck": { "dependsOn": ["^build"] },
    "lint": {}
  }
}
```

`packages/config/` — shared `tsconfig.base.json` (strict: true), `eslint` config, `prettier`. Every package extends these.

**Acceptance:** `pnpm install` succeeds; `pnpm typecheck` runs (no packages yet = no-op).

### 1.2 Local infra — Docker + env
Create `docker-compose.yml` exactly as in `docs/learning/10-local-dev-and-cost.md` (Postgres 16, Redis 7, MinIO). Create `.env.example` and a git-ignored `.env`:
```
DATABASE_URL=postgres://spendlio:spendlio@localhost:5432/spendlio
REDIS_URL=redis://localhost:6379
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_BUCKET=receipts
STORAGE_KEY=spendlio
STORAGE_SECRET=spendlio123
```
**Acceptance:** `docker compose up -d` → `psql $DATABASE_URL -c '\l'` works; MinIO console reachable at :9001.

### 1.3 `packages/contracts`
- `pnpm --filter @spendlio/contracts add zod`.
- Port the Spendlio design-system project's `contracts/src/*.ts` from import-free TS to **Zod schemas + `z.infer` types**, keeping every shape identical. (The shapes are also fully described in `docs/learning/02-contracts.md` and `03-database.md`.) Pattern:
```ts
export const TransactionSchema = z.object({
  id: z.string().uuid(),
  amount: z.number().int(),          // minor units (cents)
  currency: z.string().length(3),
  // ...mirror contracts/src/transaction.ts
});
export type Transaction = z.infer<typeof TransactionSchema>;
export const CreateTransactionInput = TransactionSchema.omit({ id:true, createdAt:true, updatedAt:true, userId:true });
```
- Keep enums (`CategoryKey`, `SplitMode`, …) as `z.enum(...)`. Keep money helpers (`toMinorUnits`, `formatMoney`).
- Add **job payload schemas** here too (e.g. `OcrJob = z.object({ receiptId: z.string().uuid() })`) and a `QUEUES` name registry.

**Acceptance:** `import { TransactionSchema } from '@spendlio/contracts'` typechecks; `TransactionSchema.parse(sample)` validates.

### 1.4 `packages/db` (Drizzle)
- `add drizzle-orm pg` + `-D drizzle-kit @types/pg`.
- Write the schema in `src/schema/*.ts`, one file per table from `docs/learning/03-database.md` (users, accounts, categories, transactions, budgets, recurring_rules, receipts, people, groups, group_members, splits, split_shares, settlements, notifications, monthly_summaries).
  - **Money columns:** `bigint('amount', { mode: 'number' })` (integer cents) + `varchar('currency',{length:3})`.
  - Every table: `id uuid pk defaultRandom`, `created_at`/`updated_at timestamptz`. User-owned: `user_id` + index `(user_id, created_at)` (or `occurred_at` for transactions). FKs via `.references()` with explicit `onDelete`. Soft-delete where noted (`deleted_at`).
- `drizzle.config.ts` (dialect postgres, `DATABASE_URL`), scripts `generate`/`migrate`, a typed `client.ts` (`drizzle(pool)`), and `seed.ts` (default categories + demo user).
- Bridge to contracts with `drizzle-zod` where table == API shape; hand-write the rest (computed `Balance`, recap).

**Acceptance:** `pnpm db:generate` produces a migration; `pnpm db:migrate` applies it; tables exist in Postgres; `pnpm db:seed` inserts defaults.

### 1.5 `packages/core`
- Pure TS. Port money helpers and add the **split engine** (even/exact/percent in integer cents with deterministic leftover-cent assignment — see `docs/learning/03-database.md`) and **balance netting**. Unit tests with vitest. No framework/DB imports.

**Acceptance:** `pnpm --filter @spendlio/core test` green; splitting $10/3 = [334,333,333] (or your chosen rule), sum exact.

### Phase 1 done when
`pnpm install && docker compose up -d && pnpm db:migrate && pnpm typecheck` all succeed, and `core` tests pass.

---

## Phase 2 · API (NestJS) — copy-ready in [`docs/build/06-api-nestjs.md`](./docs/build/06-api-nestjs.md)
- `apps/api` Nest app; `db` provider; `common/zod.pipe.ts` validating with `contracts`; dev `AuthGuard` + `CurrentUser`; cursor pagination.
- Modules: transactions (the template), budgets, categories, accounts, splits, receipts. Thin controllers → services → `core`/`db`, every query scoped by `userId`.
- `apps/api` runs the HTTP server; workers are a **separate `apps/worker`** (Phase 4). See `docs/learning/05-api-nestjs.md`.

## Phase 3 · Web (Next.js) — outline
- `apps/web` App Router; import `@spendlio/ui` styles + components; server components for reads, client components + server actions for writes (validated by `contracts`). See `docs/learning/06-web-nextjs.md`. Compose the layouts from `ui_kits/web`.

## Phase 4 · Queue + workers + storage — outline
- `packages/queue` (BullMQ conn + typed `enqueue` + `QUEUES`); `packages/storage` (`BlobStore` S3 impl for MinIO/R2/S3, presigned URLs).
- Workers in `apps/api` (`main.worker.ts`): ocr → categorize, recurring (cron), recap (cron) → notify. Idempotent, id-only payloads. See `docs/learning/07-queues-jobs.md`.

## Phase 5 · Auth — outline
- Auth.js on web; short-lived JWT to API; Nest guard sets `req.user`; every query scoped by `user_id`. See `docs/learning/08-auth-security.md`.

---

## Working agreement for Claude Code
- After each phase, run the acceptance checks before moving on.
- Any new decision → append an ADR to `docs/learning/decisions.md`.
- Don't break the golden rules in `README.md`.
- Resolve the two open items when you reach them: AI/OCR providers (Phase 4/feature) and hosting (at deploy).
