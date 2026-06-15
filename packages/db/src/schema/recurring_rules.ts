import { pgTable, uuid, varchar, bigint, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { accounts } from './accounts';

// A template transaction + cadence; the recurring worker materializes transactions
// when nextRunAt is due, then advances nextRunAt. (docs/learning/03-database.md)
export const recurringRules = pgTable('recurring_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // template fields for the transaction this rule generates:
  title: varchar('title', { length: 200 }).notNull(),
  merchant: varchar('merchant', { length: 200 }),
  amount: bigint('amount', { mode: 'number' }).notNull(),   // minor units, template currency
  currency: varchar('currency', { length: 3 }).notNull(),
  category: varchar('category', { length: 32 }).notNull(),  // CategoryKey
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'restrict' }),
  // cadence: 'daily' | 'weekly' | 'monthly' | 'yearly' (rule lives in core).
  cadence: varchar('cadence', { length: 16 }).notNull(),
  interval: bigint('interval', { mode: 'number' }).notNull().default(1), // every N cadence units
  nextRunAt: timestamp('next_run_at', { withTimezone: true }).notNull(),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byUser: index('recurring_user_created_idx').on(t.userId, t.createdAt),
  byNextRun: index('recurring_next_run_idx').on(t.nextRunAt),
}));
