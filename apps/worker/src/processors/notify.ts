import { eq } from 'drizzle-orm';
import { db, users, notifications } from '@spendlio/db';
import type { Job } from '@spendlio/queue';
import type { NotifyJob } from '@spendlio/queue';

// Human-readable titles per notification type; unknown types fall back to type.
const TITLES: Record<string, string> = {
  budget_alert: 'Budget alert',
  recap_ready: 'Your monthly recap is ready',
  settle_reminder: 'Time to settle up',
};

/**
 * Create an in-app notification row for a user. The payload carries id + type
 * (+ an optional dedupeKey); any richer body is derived here (later: fan out to
 * email/push).
 *
 * Idempotent: when a dedupeKey is set, the partial unique index
 * (user_id, type, dedupe_key) + onConflictDoNothing collapses a retried/duplicate
 * job to a single row instead of inserting twice.
 */
export async function processNotify(job: Job<NotifyJob>): Promise<void> {
  const { userId, type, dedupeKey } = job.data;

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return;

  await db
    .insert(notifications)
    .values({
      userId,
      type,
      title: TITLES[type] ?? type,
      data: { type },
      dedupeKey: dedupeKey ?? null,
    })
    .onConflictDoNothing();
}
