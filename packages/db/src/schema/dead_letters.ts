import { pgTable, uuid, varchar, jsonb, text, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * The dead-letter queue: a durable record of a job that exhausted its retries.
 * The worker writes one row on a job's FINAL failed attempt (ADR-029); a redrive
 * re-enqueues from `payload`. This replaces relying on BullMQ's evictable fail
 * set as the "dead-letter view" — those entries silently disappear at 5k.
 *
 * Not user-scoped: this is operational infrastructure, not user data. `jobId`
 * mirrors the (idempotent) BullMQ job id so a redrive dedupes naturally.
 */
export const deadLetters = pgTable('dead_letters', {
  id: uuid('id').primaryKey().defaultRandom(),
  queue: varchar('queue', { length: 32 }).notNull(),   // QUEUES name
  jobId: varchar('job_id', { length: 200 }),           // BullMQ job id (may be null)
  payload: jsonb('payload').notNull(),                 // the job's data, for redrive
  error: text('error'),                                // failure message / stack
  redrivenAt: timestamp('redriven_at', { withTimezone: true }), // set when re-enqueued
  failedAt: timestamp('failed_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byQueue: index('dead_letters_queue_failed_idx').on(t.queue, t.failedAt),
}));
