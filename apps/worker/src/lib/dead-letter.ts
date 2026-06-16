import { and, eq, isNull } from 'drizzle-orm';
import { db, deadLetters } from '@spendlio/db';
import { enqueue, QUEUES, type QueueName } from '@spendlio/queue';
import type { Job } from '@spendlio/queue';

/**
 * Dead-letter handling (ADR-029). A job that exhausts its BullMQ retries is
 * recorded durably here and routed to a single alert sink, instead of silently
 * aging out of BullMQ's evictable fail set. `redriveDeadLetter` re-enqueues from
 * the stored payload.
 *
 * Lives in apps/worker (not packages/queue) because persistence needs the DB,
 * and queue stays a pure BullMQ + contracts package per the layering rules.
 */

/** Is this the job's final attempt? Mirrors BullMQ's own retry guard. */
export function isFinalAttempt(job: Pick<Job, 'attemptsMade' | 'opts'>): boolean {
  return job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
}

/** The single alerting seam — swap console for PagerDuty/Slack/email later. */
export function alertFailure(queue: string, jobId: string | undefined, error: string): void {
  console.error(`[dead-letter] ${queue} job ${jobId ?? '(no id)'} failed permanently: ${error}`);
}

/**
 * Record a permanently-failed job and alert. Called from the worker's `failed`
 * handler only on the final attempt. Best-effort: a DLQ write must never throw
 * back into the event handler.
 */
export async function recordDeadLetter(
  queue: string,
  job: Pick<Job, 'id' | 'data'> | undefined,
  err: Error | undefined,
): Promise<void> {
  const message = err?.stack ?? err?.message ?? 'unknown error';
  try {
    await db.insert(deadLetters).values({
      queue,
      jobId: job?.id ?? null,
      payload: job?.data ?? {},
      error: message,
    });
  } catch (writeErr) {
    console.error(`[dead-letter] failed to persist DLQ row for ${queue}:`, writeErr);
  }
  alertFailure(queue, job?.id, message);
}

const QUEUE_NAMES = new Set<string>(Object.values(QUEUES));

/**
 * Re-enqueue a dead-letter record by id (operator action / script). Marks the
 * row redriven so it isn't replayed twice. Returns false if the row is missing,
 * already redriven, or its queue is unknown.
 */
export async function redriveDeadLetter(id: string): Promise<boolean> {
  const [row] = await db
    .select()
    .from(deadLetters)
    .where(and(eq(deadLetters.id, id), isNull(deadLetters.redrivenAt)))
    .limit(1);
  if (!row || !QUEUE_NAMES.has(row.queue)) return false;

  await enqueue(row.queue as QueueName, row.payload as never);
  await db.update(deadLetters).set({ redrivenAt: new Date(), updatedAt: new Date() }).where(eq(deadLetters.id, id));
  return true;
}
