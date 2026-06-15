import { pgTable, uuid, varchar, bigint, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const receipts = pgTable('receipts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  imageKey: varchar('image_key', { length: 1024 }).notNull(),  // object-storage key (S3/MinIO)
  status: varchar('status', { length: 16 }).notNull(),         // processing|parsed|failed
  merchant: varchar('merchant', { length: 200 }),
  total: bigint('total', { mode: 'number' }),                  // minor units, OCR-parsed
  currency: varchar('currency', { length: 3 }),
  purchasedAt: timestamp('purchased_at', { withTimezone: true }),
  // OCR payload: line items + raw provider response, as one JSONB blob.
  ocr: jsonb('ocr'),
  transactionId: uuid('transaction_id'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byUser: index('receipts_user_created_idx').on(t.userId, t.createdAt),
}));
