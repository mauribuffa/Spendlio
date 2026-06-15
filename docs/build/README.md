# Build steps — index

Concrete, copy-ready steps to build Spendlio. Do them **in order**; each ends with an acceptance check you must pass before continuing.

## Phase 1 — Foundation (do this first)
1. [`01-monorepo-skeleton.md`](./01-monorepo-skeleton.md) — pnpm + Turborepo + `packages/config`
2. [`02-docker-and-env.md`](./02-docker-and-env.md) — Postgres + Redis + MinIO + `.env`
3. [`03-contracts-package.md`](./03-contracts-package.md) — `@spendlio/contracts` (Zod)
4. [`04-db-package-drizzle.md`](./04-db-package-drizzle.md) — `@spendlio/db` (Drizzle schema + migrations)
5. [`05-core-package.md`](./05-core-package.md) — `@spendlio/core` (money + split engine + tests)
6. [`99-acceptance.md`](./99-acceptance.md) — Phase 1 done-checklist

## Phase 2 — API (NestJS)
6. [`06-api-nestjs.md`](./06-api-nestjs.md) — API foundation (Zod pipe, db module, auth guard, pagination) + the `transactions` resource as the template for every module.

## Phases 3–5 — outlined in `../../BUILD_PLAN.md`
Web (Next.js) → queue/workers (`apps/worker`) + storage → auth. Each gets its own numbered step docs here when you reach it — write them in the same style (files + commands + acceptance), and append an ADR to `../learning/decisions.md` for any decision.

> Each step references the *why* in `../learning/`. When in doubt, read the matching learning doc.
