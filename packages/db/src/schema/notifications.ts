import { pgTable, uuid, varchar, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 32 }).notNull(),     // e.g. budget_alert | recap_ready | settle_reminder
  title: varchar('title', { length: 200 }).notNull(),
  body: varchar('body', { length: 1000 }),
  data: jsonb('data'),                                 // arbitrary payload for deep-linking
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byUser: index('notifications_user_created_idx').on(t.userId, t.createdAt),
}));
