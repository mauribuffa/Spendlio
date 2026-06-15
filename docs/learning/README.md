# Spendlio — Learning & Decisions

A **living knowledge base**. It explains not just *what* we built, but *why* — the tradeoffs, the alternatives we rejected, and the conventions you should follow. Read it top-to-bottom once; come back to individual files as we build each part with Claude Code.

> **How we keep this current:** every meaningful decision we make while building gets (1) a short "why this, not that" in the relevant file below, and (2) a one-line entry in [`decisions.md`](./decisions.md) — our ADR (Architecture Decision Record) log.

## Learning path

Read in this order:

1. [`00-system-overview.md`](./00-system-overview.md) — the big picture: how the pieces fit, the data lifecycle.
2. [`01-monorepo.md`](./01-monorepo.md) — why a monorepo, pnpm + Turborepo, how packages depend on each other.
3. [`02-contracts.md`](./02-contracts.md) — the `contracts` package: one source of truth for types, shared by web + API + DB.
4. [`03-database.md`](./03-database.md) — Postgres schema design, IDs, timestamps, **how we store money**.
5. [`04-orm-drizzle.md`](./04-orm-drizzle.md) — why Drizzle, column conventions, migrations.
6. [`05-api-nestjs.md`](./05-api-nestjs.md) — Nest module layout, validating input with contracts.
7. [`06-web-nextjs.md`](./06-web-nextjs.md) — App Router, server vs client components, consuming the design system.
8. [`07-queues-jobs.md`](./07-queues-jobs.md) — background jobs: OCR, AI categorization, recurring, recaps, notifications.
9. [`08-auth-security.md`](./08-auth-security.md) — auth model and how we keep each user's data isolated.
10. [`09-ai-ocr.md`](./09-ai-ocr.md) — receipt OCR, AI categorization, and the chat-over-your-data assistant.
11. [`10-local-dev-and-cost.md`](./10-local-dev-and-cost.md) — Docker (Postgres/Redis/MinIO), $0 local dev, and the cheapest way to deploy.
12. [`12-currency-and-fx.md`](./12-currency-and-fx.md) — multi-currency: a preferred base currency, expenses in any currency, exact per-currency "bank tabs", and converted totals.
13. [`13-i18n.md`](./13-i18n.md) — internationalization: language vs locale vs currency, message catalogs, `Intl` formatting, plurals, RTL.

> Several topics now carry a **“Deep dive (theory)”** section for the underlying mechanics (e.g. DB indexing in `03`, BullMQ internals in `07`). More land per topic as we build.

Plus [`decisions.md`](./decisions.md) — the running ADR log, and [`glossary.md`](./glossary.md) — plain-English definitions of every term.

## Conventions cheat-sheet

These are the house rules. Each is explained in the linked file.

- **Money is stored as integer minor units** (cents), never floats; **minor-unit scale is per-currency** and amounts are never summed across currencies. → `03-database.md`, `12-currency-and-fx.md`
- **Workers are their own app (`apps/worker`)**, not part of `apps/api`; a job's payload is a contract, its work lives in `core`. → `07-queues-jobs.md`
- **Local infra runs in Docker** (Postgres + Redis + MinIO); code targets interfaces, not vendors, so local↔prod is a config swap. → `10-local-dev-and-cost.md`
- **Types flow one way:** `contracts` is the source of truth; web/API/DB import it, never the reverse. → `02-contracts.md`
- **`core` and `contracts` import no framework, no DB, no React** — pure and testable. → `01-monorepo.md`
- **Anything slow or external is a queue job**, not an inline HTTP handler. → `07-queues-jobs.md`
- **Every table has `id`, `created_at`, `updated_at`**; user-owned rows have `user_id` and are always filtered by it. → `03-database.md`, `08-auth-security.md`
- **Validate at the edge:** every API input is parsed by a Zod schema from `contracts` before it touches business logic. → `05-api-nestjs.md`

## A note on how to read decisions

When you see a **🟡 Proposed** tag, it's my recommendation with reasoning — your call to confirm or change. **✅ Decided** means we've agreed. Disagreeing is encouraged; that's how you learn the tradeoffs.
