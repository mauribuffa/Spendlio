import { Queue, type JobsOptions } from 'bullmq';
import {
  QUEUES,
  type QueueName,
  OcrJob,
  CategorizeJob,
  RecapJob,
  RecurringJob,
  NotifyJob,
} from '@spendlio/contracts';
import { getConnectionOptions } from './connection';
import type { JobPayloadMap } from './jobs';

// Structural shape of a validator — avoids a direct `zod` dependency here (queue
// stays BullMQ + contracts only); the contracts schemas satisfy it.
interface PayloadValidator {
  parse(value: unknown): unknown;
}

/**
 * Job payload schemas keyed by queue name. Validating at enqueue() turns "a bad
 * job poisons the worker (and silently dies in the fail set)" into "a bad enqueue
 * is rejected at the producer, synchronously, with a clear error".
 */
const JOB_SCHEMAS: Record<QueueName, PayloadValidator> = {
  ocr: OcrJob,
  categorize: CategorizeJob,
  recap: RecapJob,
  recurring: RecurringJob,
  notify: NotifyJob,
};

/**
 * Default job policy (doc 07): retry transient failures with exponential
 * backoff; trim finished jobs so Redis memory stays bounded (free-tier safe).
 */
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { count: 1000 }, // keep the last 1k for inspection
  // Short-term inspection only — the durable record of a permanently-failed job
  // is the `dead_letters` table the worker writes on the final attempt (ADR-029),
  // not this evictable set.
  removeOnFail: { count: 5000 },
};

// One Queue instance per registered name, lazily created. BullMQ builds its own
// ioredis client from the connection options. Typed by payload for getQueue()
// callers; the job-name generic is left as the default `string`.
const queues = new Map<QueueName, Queue>();

export function getQueue<N extends QueueName>(name: N): Queue<JobPayloadMap[N]> {
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, {
      connection: getConnectionOptions(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
    queues.set(name, q);
  }
  return q as Queue<JobPayloadMap[N]>;
}

/**
 * A deterministic, idempotent jobId per (queue, payload) so re-enqueuing the
 * same logical work dedupes in BullMQ. Callers can override via opts.jobId.
 * NB: BullMQ forbids ':' in custom jobIds, so segments are joined with '-'.
 *  ocr-<receiptId> · categorize-<transactionId> · recap-<userId>-<month>
 *  recurring-<ruleId>|all · notify-<userId>-<type>
 */
function defaultJobId<N extends QueueName>(name: N, payload: JobPayloadMap[N]): string | undefined {
  const p = payload as Record<string, unknown>;
  switch (name) {
    case 'ocr':         return `ocr-${p.receiptId}`;
    case 'categorize':  return `categorize-${p.transactionId}`;
    case 'recap':       return `recap-${p.userId}-${p.month}`;
    case 'recurring':   return `recurring-${p.ruleId ?? 'all'}`;
    case 'notify':      return `notify-${p.userId}-${p.type}${p.dedupeKey ? `-${p.dedupeKey}` : ''}`;
    default:            return undefined;
  }
}

/**
 * Type-safe producer: the payload type is keyed by the queue name, so
 * `enqueue('categorize', { receiptId })` is a compile error and
 * `enqueue('categorize', { transactionId })` is required.
 *
 * Idempotent by default: a deterministic jobId is derived from the payload so
 * re-enqueuing the same work is a no-op (BullMQ dedupes by jobId). Override with
 * opts.jobId, or pass `{ jobId: undefined }` deliberately for a fresh job.
 */
export function enqueue<N extends QueueName>(
  name: N,
  payload: JobPayloadMap[N],
  opts?: JobsOptions,
) {
  // Reject malformed payloads at the producer (throws ZodError) rather than
  // letting them fail repeatedly in the worker and vanish into the fail set.
  JOB_SCHEMAS[name].parse(payload);
  const jobId = opts && 'jobId' in opts ? opts.jobId : defaultJobId(name, payload);
  // The boundary above is fully typed (name + matching payload). BullMQ's add()
  // first param is `NameType`, derived via a conditional over DataType that TS
  // can't reduce for the generic indexed JobPayloadMap[N]; the job name is the
  // queue name by convention, so we pass it through the untyped name slot.
  const queue = getQueue(name) as Queue;
  return queue.add(name, payload, { ...opts, jobId });
}

/** Close all open Queue instances (graceful shutdown). */
export async function closeQueues(): Promise<void> {
  await Promise.all([...queues.values()].map((q) => q.close()));
  queues.clear();
}

// Re-export the registry so consumers import queue names from one place.
export { QUEUES, type QueueName };
