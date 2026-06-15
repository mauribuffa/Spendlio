# 04 · The ORM — Drizzle

**What an ORM does:** lets you describe tables in TypeScript and query them with typed code instead of hand-written SQL strings, while keeping the database schema in sync via migrations.

## 🟡 Why Drizzle (and the alternative)

| | **Drizzle** (proposed) | **Prisma** (alternative) |
|---|---|---|
| Schema | defined in TypeScript | a separate `.prisma` DSL |
| Queries | SQL-like, thin, predictable | higher-level client, more "magic" |
| Types | inferred from your schema, no codegen step | generated client (codegen step) |
| Runtime | tiny, edge-friendly | heavier engine |
| Learning value | you stay close to SQL — great for *learning* what's actually happening | hides more SQL |

For a learning-focused build, **Drizzle wins**: it's basically typed SQL, so you see the queries, the joins, the indexes. You learn the database, not just the ORM. Prisma is more "batteries included" if we ever want that.

## Column conventions

```ts
// packages/db/src/schema/transactions.ts
import { pgTable, uuid, bigint, varchar, timestamp, index } from 'drizzle-orm/pg-core';

export const transactions = pgTable('transactions', {
  id:         uuid('id').primaryKey().defaultRandom(),
  userId:     uuid('user_id').notNull().references(() => users.id),
  amount:     bigint('amount', { mode: 'number' }).notNull(),   // minor units (cents)
  currency:   varchar('currency', { length: 3 }).notNull(),
  categoryId: uuid('category_id').references(() => categories.id),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byUser: index('txn_user_idx').on(t.userId, t.createdAt),
}));
```

Conventions to follow:
- **snake_case** column names in SQL, **camelCase** in TS (Drizzle maps them).
- **Money columns use `bigint('…', { mode: 'number' })`** holding minor units. (If we switch to the `numeric` approach from `03-database.md`, these become `numeric('amount', { precision: 14, scale: 2 })` and we route every read through a decimal type — decided in `decisions.md`.)
- **Index every `user_id`** (and usually `(user_id, created_at)` for list queries).
- **`references()`** for every foreign key, with an explicit `onDelete`.

> **About your "numeric for numbers" instinct:** it's the right instinct for *quantities* and *rates*. For **money specifically** we still recommend integer cents (see the comparison in `03-database.md`) — but if we standardize on `numeric` + a decimal library, Drizzle's `numeric(p, s)` is exactly how we'd declare those columns. Either way the rule is: **money is never a JS float.**

## Migrations

- We write schema in TS, then `drizzle-kit generate` produces a SQL migration file; `drizzle-kit migrate` applies it.
- **Migrations are committed and code-reviewed** — they're the history of the database. Never edit a shipped migration; add a new one.
- Seed data (default categories, a demo user) lives in a separate `seed` script, not in migrations.

## Bridging to `contracts`

Drizzle infers a row type from each table (`typeof transactions.$inferSelect`). Where the API shape equals the table shape, `drizzle-zod` can generate the Zod schema so we don't write it twice. Where they differ (computed `Balance`, the recap payload, OCR JSONB structure) we hand-write the contract. → [`02-contracts.md`](./02-contracts.md)
