import { pgTable, uuid, varchar, bigint, timestamp, jsonb, unique } from 'drizzle-orm/pg-core';
import { users } from './users';

// The monthly recap payload, built by the recap worker; one row per user+month.
export const monthlySummaries = pgTable('monthly_summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  month: varchar('month', { length: 7 }).notNull(),        // YYYY-MM
  currency: varchar('currency', { length: 3 }).notNull(),  // user's default currency at build time
  totalIncome: bigint('total_income', { mode: 'number' }).notNull(),   // minor units
  totalExpense: bigint('total_expense', { mode: 'number' }).notNull(), // minor units
  net: bigint('net', { mode: 'number' }).notNull(),                    // income - expense
  byCategory: jsonb('by_category').notNull().default([]),  // CategorySpend[]
  topMerchant: varchar('top_merchant', { length: 200 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  // The unique index on (user_id, month) also serves (user_id) prefix lookups,
  // so a separate same-columns index would be redundant.
  uniqUserMonth: unique('monthly_summaries_user_month_uniq').on(t.userId, t.month),
}));
