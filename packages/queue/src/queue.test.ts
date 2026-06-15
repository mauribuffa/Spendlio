import { describe, it, expect, expectTypeOf, afterAll, beforeAll } from 'vitest';
import { DEFAULT_JOB_OPTIONS, QUEUES, enqueue, getQueue, closeQueues, closeRedisClient } from './index';
import type { JobPayloadMap } from './index';

describe('DEFAULT_JOB_OPTIONS', () => {
  it('retries with exponential backoff and trims finished jobs', () => {
    expect(DEFAULT_JOB_OPTIONS.attempts).toBe(3);
    expect(DEFAULT_JOB_OPTIONS.backoff).toEqual({ type: 'exponential', delay: 2000 });
    expect(DEFAULT_JOB_OPTIONS.removeOnComplete).toEqual({ count: 1000 });
    expect(DEFAULT_JOB_OPTIONS.removeOnFail).toEqual({ count: 5000 });
  });
});

describe('QUEUES registry', () => {
  it('exposes the five pipelines from contracts', () => {
    expect(Object.keys(QUEUES).sort()).toEqual(['categorize', 'notify', 'ocr', 'recap', 'recurring']);
  });
});

describe('JobPayloadMap (type-level)', () => {
  it('keys each queue to its payload shape', () => {
    expectTypeOf<JobPayloadMap['ocr']>().toEqualTypeOf<{ receiptId: string }>();
    expectTypeOf<JobPayloadMap['categorize']>().toEqualTypeOf<{ transactionId: string }>();
    expectTypeOf<JobPayloadMap['recap']>().toMatchTypeOf<{ userId: string; month: string }>();
  });
});

// Real enqueue against Redis (docker compose up). Skips cleanly if unreachable.
// Always tears down (closeQueues + closeRedisClient) so vitest exits with no
// open handles.
describe('enqueue (Redis)', () => {
  let online = false;

  beforeAll(async () => {
    try {
      await getQueue('categorize').waitUntilReady();
      online = true;
    } catch {
      online = false;
    }
  });

  afterAll(async () => {
    await closeQueues();
    await closeRedisClient();
  });

  it('queues a job with a deterministic, idempotent jobId from the payload', async (ctx) => {
    if (!online) ctx.skip();
    const q = getQueue('categorize');
    const txnId = '00000000-0000-0000-0000-0000000000cc';
    const jobId = `categorize-${txnId}`;
    await q.remove(jobId).catch(() => {});

    const a = await enqueue('categorize', { transactionId: txnId });
    const b = await enqueue('categorize', { transactionId: txnId }); // same id ⇒ dedup

    expect(a.id).toBe(jobId);
    expect(b.id).toBe(a.id);
    expect(a.data).toEqual({ transactionId: txnId });
    expect(await q.getJobCounts('wait').then((c) => c.wait)).toBeGreaterThanOrEqual(1);

    await q.remove(jobId).catch(() => {});
  });
});
