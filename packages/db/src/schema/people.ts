import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users';

// A friend / roommate you split with. Owned by the user who added them.
// `isSelf` marks the implicit "you" person used as the payer/viewpoint for
// model-B split balances (ADR-021 follow-up); it is hidden from GET /people.
export const people = pgTable('people', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 120 }).notNull(),
  email: varchar('email', { length: 255 }),
  avatarUrl: varchar('avatar_url', { length: 1024 }),
  isSelf: boolean('is_self').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byUser: index('people_user_created_idx').on(t.userId, t.createdAt),
  // At most one self-person per user — makes lazy self-person creation race-safe
  // (insert .onConflictDoNothing + re-select). Partial: only the is_self rows.
  oneSelfPerUser: uniqueIndex('people_one_self_per_user').on(t.userId).where(sql`${t.isSelf}`),
}));
