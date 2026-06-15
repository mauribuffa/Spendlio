import { Worker, type Job, type Processor, type WorkerOptions } from 'bullmq';
import type { QueueName } from '@spendlio/contracts';
import { getConnectionOptions } from './connection';
import type { JobPayloadMap } from './jobs';

/**
 * Typed Worker factory for apps/worker. The processor receives a Job whose
 * `data` is typed to the queue's payload. Concurrency is tunable per queue
 * (OCR is IO-bound → higher; CPU-heavy work → lower). (doc 07)
 */
export function createWorker<N extends QueueName>(
  name: N,
  processor: Processor<JobPayloadMap[N]>,
  opts?: Omit<WorkerOptions, 'connection'>,
): Worker<JobPayloadMap[N]> {
  return new Worker<JobPayloadMap[N]>(name, processor, {
    connection: getConnectionOptions(),
    ...opts,
  });
}

export type { Job, Processor, WorkerOptions };
