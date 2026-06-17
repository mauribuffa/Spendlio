import { pgTable, uuid, varchar, bigint, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const receipts = pgTable('receipts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  imageKey: varchar('image_key', { length: 1024 }).notNull(),  // object-storage key (S3/MinIO)
  sha256: varchar('sha256', { length: 64 }),                   // client-computed content hash (hex); content-addressed key + dedup + integrity
  status: varchar('status', { length: 16 }).notNull(),         // processing|parsed|failed
  failureReason: varchar('failure_reason', { length: 32 }),     // why a 'failed' receipt failed; null otherwise (ReceiptFailureReason)
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
  // Fast lookup for content-addressed dedup ("have we already seen this hash?").
  byUserHash: index('receipts_user_sha256_idx').on(t.userId, t.sha256),
}));
