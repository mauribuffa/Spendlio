import { pgTable, uuid, varchar, bigint, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { people } from './people';

// A "who pays whom" transfer to clear a balance.
export const settlements = pgTable('settlements', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fromPersonId: uuid('from_person_id').notNull().references(() => people.id, { onDelete: 'restrict' }),
  toPersonId: uuid('to_person_id').notNull().references(() => people.id, { onDelete: 'restrict' }),
  amount: bigint('amount', { mode: 'number' }).notNull(), // minor units
  currency: varchar('currency', { length: 3 }).notNull(),
  status: varchar('status', { length: 16 }).notNull().default('pending'), // pending|settled
  settledAt: timestamp('settled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byUser: index('settlements_user_created_idx').on(t.userId, t.createdAt),
}));
