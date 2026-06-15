import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

// The "bank tabs" — each account has its OWN currency (see 12-currency-and-fx.md).
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 120 }).notNull(),
  type: varchar('type', { length: 16 }).notNull(),       // card|checking|savings|cash
  currency: varchar('currency', { length: 3 }).notNull(),
  institution: varchar('institution', { length: 120 }),
  last4: varchar('last4', { length: 4 }),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byUser: index('accounts_user_created_idx').on(t.userId, t.createdAt),
}));
