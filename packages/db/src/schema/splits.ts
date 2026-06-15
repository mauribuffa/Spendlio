import { pgTable, uuid, varchar, bigint, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { groups } from './groups';
import { people } from './people';

// A split of one expense across people. Per-person shares live in split_shares.
export const splits = pgTable('splits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  transactionId: uuid('transaction_id'),  // soft FK to transactions (avoid circular money cascade)
  groupId: uuid('group_id').references(() => groups.id, { onDelete: 'restrict' }),
  mode: varchar('mode', { length: 16 }).notNull(),     // even|exact|percent
  total: bigint('total', { mode: 'number' }).notNull(),// minor units
  currency: varchar('currency', { length: 3 }).notNull(),
  payerId: uuid('payer_id').notNull().references(() => people.id, { onDelete: 'restrict' }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byUser: index('splits_user_created_idx').on(t.userId, t.createdAt),
  byTransaction: index('splits_transaction_idx').on(t.transactionId),
}));
