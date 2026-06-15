import { pgTable, uuid, varchar, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 32 }).notNull(),     // CategoryKey
  label: varchar('label', { length: 64 }).notNull(),
  kind: varchar('kind', { length: 16 }).notNull(),   // expense|income|transfer
  icon: varchar('icon', { length: 64 }).notNull(),
  color: varchar('color', { length: 7 }).notNull(),  // hex
  isDefault: boolean('is_default').notNull().default(true),
  // null for built-in categories shared by all users; set for user-defined.
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byUser: index('categories_user_idx').on(t.userId),
}));
