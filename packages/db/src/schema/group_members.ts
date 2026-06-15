import { pgTable, uuid, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { groups } from './groups';
import { people } from './people';

// Join table: which people belong to a group. Scoped to its group (owned via the group).
export const groupMembers = pgTable('group_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  personId: uuid('person_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqMember: unique('group_members_group_person_uniq').on(t.groupId, t.personId),
  byGroup: index('group_members_group_idx').on(t.groupId),
  byPerson: index('group_members_person_idx').on(t.personId),
}));
