import { pgTable, uuid, bigint, timestamp, index } from 'drizzle-orm/pg-core';
import { splits } from './splits';
import { people } from './people';

// One person's share of a split, in integer minor units (computed in core).
export const splitShares = pgTable('split_shares', {
  id: uuid('id').primaryKey().defaultRandom(),
  splitId: uuid('split_id').notNull().references(() => splits.id, { onDelete: 'cascade' }),
  personId: uuid('person_id').notNull().references(() => people.id, { onDelete: 'restrict' }),
  amount: bigint('amount', { mode: 'number' }).notNull(), // minor units owed by this person
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  bySplit: index('split_shares_split_idx').on(t.splitId),
  byPerson: index('split_shares_person_idx').on(t.personId),
}));
