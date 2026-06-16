import { pgTable, uuid, varchar, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 32 }).notNull(),     // e.g. budget_alert | recap_ready | settle_reminder
  title: varchar('title', { length: 200 }).notNull(),
  body: varchar('body', { length: 1000 }),
  data: jsonb('data'),                                 // arbitrary payload for deep-linking
  // Optional discriminator so the worker can dedupe an otherwise-identical
  // notification (e.g. one settle reminder per person per day). NULL = no dedupe.
  dedupeKey: varchar('dedupe_key', { length: 200 }),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byUser: index('notifications_user_created_idx').on(t.userId, t.createdAt),
  // At most one notification per (user, type, dedupeKey) when a key is set;
  // backs the worker's onConflictDoNothing so a retried job can't double-insert.
  dedupe: uniqueIndex('notifications_user_type_dedupe_idx')
    .on(t.userId, t.type, t.dedupeKey)
    .where(sql`${t.dedupeKey} is not null`),
}));
