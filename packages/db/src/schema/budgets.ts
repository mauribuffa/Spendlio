import { pgTable, uuid, varchar, bigint, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 32 }).notNull(),  // CategoryKey
  limit: bigint('limit', { mode: 'number' }).notNull(),     // minor units
  currency: varchar('currency', { length: 3 }).notNull(),
  period: varchar('period', { length: 16 }).notNull().default('monthly'), // weekly|monthly|yearly
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byUserCategory: index('budgets_user_category_idx').on(t.userId, t.category),
}));
