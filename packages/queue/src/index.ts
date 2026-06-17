// Connection
export { getConnectionOptions, getRedisClient, closeRedisClient } from './connection';

// Producer surface
export { enqueue, requeue, getQueue, closeQueues, DEFAULT_JOB_OPTIONS, QUEUES, type QueueName } from './queues';

// Consumer surface (apps/worker)
export { createWorker, type Job, type Processor, type WorkerOptions } from './worker';

// Payload types
export type { JobPayloadMap, RecurringJob, NotifyJob } from './jobs';
