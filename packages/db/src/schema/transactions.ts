import { pgTable, uuid, varchar, bigint, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { accounts } from './accounts';

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'restrict' }),
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
  byAccount: index('txn_account_idx').on(t.accountId),
  // One materialized occurrence per (recurring rule, occurredAt) — backs the
  // recurring processor's onConflictDoNothing so retried/concurrent sweeps can't
  // double-create money. Partial: only rows that came from a recurring rule.
  oneOccurrencePerRule: uniqueIndex('txn_recurring_occurred_idx')
    .on(t.recurringId, t.occurredAt)
    .where(sql`${t.recurringId} is not null`),
}));
