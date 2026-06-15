# Getting started

The fastest path from zero to a running foundation. Do these in order. Anything in a code block is copy-paste-able.

## 0 · Prerequisites
- **Node 20+**, **Docker Desktop** (running), and **pnpm**:
  ```bash
  corepack enable && corepack prepare pnpm@latest --activate
  node -v && pnpm -v && docker -v
  ```

## 1 · Create the repo
```bash
mkdir spendlio && cd spendlio
git init
```
Copy `CLAUDE.md`, `ARCHITECTURE.md`, `DESIGN_REFERENCE.md`, and the `docs/` folder from this bundle into the repo root.

## 2 · Build the foundation (Phase 1)
Open the repo in **Claude Code** and tell it:
> Read `CLAUDE.md` and follow `docs/build/` steps 01–05 in order. Run each step's acceptance check before moving on. Stop after step 05 and show me the results.

Or do it yourself — each `docs/build/0X-*.md` has the exact files and commands. The order is:
1. `docs/build/01-monorepo-skeleton.md` — pnpm + Turborepo + `packages/config`
2. `docs/build/02-docker-and-env.md` — `docker-compose.yml` + `.env`
3. `docs/build/03-contracts-package.md` — `@spendlio/contracts` (Zod)
4. `docs/build/04-db-package-drizzle.md` — `@spendlio/db` (Drizzle schema + migrations)
5. `docs/build/05-core-package.md` — `@spendlio/core` (money + split engine + tests)

## 3 · Bring it up
```bash
pnpm install
docker compose up -d
cp .env.example .env
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm typecheck && pnpm --filter @spendlio/core test
```

## 4 · You're done with the foundation when…
See `docs/build/99-acceptance.md`. In short: install + docker + migrate + typecheck + core tests all pass, and the database has the seeded tables and default categories.

## 5 · Next
Continue with Phases 2–5 in `BUILD_PLAN.md` (API → Web → queue/workers/storage → auth). Each gets its own `docs/build/` steps written the same way as you reach it.

---

### Tips for driving Claude Code
- Work **one step at a time**; verify the acceptance check, then continue.
- After any real decision (a library choice, a schema tradeoff), tell Claude Code to **append an ADR** to `docs/learning/decisions.md`.
- If something contradicts a **Golden Rule** in `CLAUDE.md`, stop and reconcile — those rules are the spine of the architecture.
