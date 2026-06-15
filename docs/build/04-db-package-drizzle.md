# Build step 04 · `@spendlio/db` (Drizzle)

Goal: the Postgres schema in TypeScript, migrations, a typed client, and a seed. Money columns are `bigint` cents.

## Setup
```bash
mkdir -p packages/db/src/schema
pnpm --filter @spendlio/db add drizzle-orm pg
pnpm --filter @spendlio/db add -D drizzle-kit @types/pg tsx
```
**`packages/db/package.json`** (scripts)
```json
{
  "name": "@spendlio/db",
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "generate": "drizzle-kit generate",
    "migrate": "drizzle-kit migrate",
    "seed": "tsx src/seed.ts",
    "studio": "drizzle-kit studio",
    "typecheck": "tsc --noEmit"
  }
}
```

**`packages/db/drizzle.config.ts`**
```ts
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/*.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

**`packages/db/src/client.ts`**
```ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
export type DB = typeof db;
```

## Schema — conventions
- `id uuid pk defaultRandom()`, `created_at`/`updated_at timestamptz defaultNow()`.
- **Money = `bigint('amount', { mode: 'number' })`** (integer cents) + `varchar('currency',{length:3})`.
- User-owned tables: `user_id uuid notNull references(users.id)`, index `(user_id, …)`.
- FKs via `.references(() => x.id, { onDelete: 'restrict' })` for money rows.

**`src/schema/users.ts`**
```ts
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 120 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  avatarUrl: varchar('avatar_url', { length: 1024 }),
  defaultCurrency: varchar('default_currency', { length: 3 }).notNull().default('USD'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

**`src/schema/categories.ts`**
```ts
import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 32 }).notNull(),
  label: varchar('label', { length: 64 }).notNull(),
  kind: varchar('kind', { length: 16 }).notNull(),    // expense|income|transfer
  icon: varchar('icon', { length: 64 }).notNull(),
  color: varchar('color', { length: 7 }).notNull(),
  isDefault: boolean('is_default').notNull().default(true),
  userId: uuid('user_id').references(() => users.id), // null for built-ins
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

**`src/schema/transactions.ts`** (the money table — model for the rest)
```ts
import { pgTable, uuid, varchar, bigint, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { accounts } from './accounts';
export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  title: varchar('title', { length: 200 }).notNull(),
  merchant: varchar('merchant', { length: 200 }),
  amount: bigint('amount', { mode: 'number' }).notNull(),       // minor units, ORIGINAL currency
  currency: varchar('currency', { length: 3 }).notNull(),
  // FX snapshot to the user's base currency (null when currency === base) — see 12-currency-and-fx.md
  fxBaseCurrency: varchar('fx_base_currency', { length: 3 }),
  fxBaseAmount: bigint('fx_base_amount', { mode: 'number' }),
  fxRate: varchar('fx_rate', { length: 32 }),   // store as exact string to avoid float drift
  fxAsOf: varchar('fx_as_of', { length: 10 }),  // YYYY-MM-DD
  category: varchar('category', { length: 32 }).notNull(),
  accountId: uuid('account_id').references(() => accounts.id),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  note: varchar('note', { length: 1000 }),
  status: varchar('status', { length: 16 }).notNull(),
  source: varchar('source', { length: 16 }).notNull().default('manual'),
  receiptId: uuid('receipt_id'),
  splitId: uuid('split_id'),
  recurringId: uuid('recurring_id'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byUser: index('txn_user_occurred_idx').on(t.userId, t.occurredAt),
}));
```

**Author the rest the same way**, from `docs/learning/03-database.md`:
`accounts` (has its own `currency` — the "bank tabs"), `budgets`, `recurring_rules`, `receipts` (use `jsonb('ocr')` for the OCR payload), `people`, `groups`, `group_members`, `splits`, `split_shares`, `settlements`, `notifications`, `monthly_summaries`, and **`fx_rates`** (`base`, `quote`, `date`, `rate`) for currency conversion. Add a barrel **`src/schema/index.ts`** re-exporting all tables, and **`src/index.ts`** re-exporting `db`, `pool`, and `schema`.

**`src/seed.ts`** — insert the 12 default categories (keys/icons/colors from the design system's `CategoryIcon`) and a demo user.

## Bridging to contracts
Where a table equals an API shape, generate its Zod with `drizzle-zod` (`createInsertSchema`/`createSelectSchema`) to avoid duplication. Hand-write contracts that differ from storage (computed `Balance`, the recap payload).

## Acceptance
```bash
pnpm db:generate          # creates drizzle/*.sql migration
pnpm db:migrate           # applies to local Postgres
pnpm db:seed              # default categories + demo user
psql "$DATABASE_URL" -c '\dt'           # tables exist
psql "$DATABASE_URL" -c 'select key from categories;'   # 12 rows
```
