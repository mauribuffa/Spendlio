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
  it('exposes the six pipelines from contracts', () => {
    expect(Object.keys(QUEUES).sort()).toEqual(['categorize', 'fx', 'notify', 'ocr', 'recap', 'recurring']);
  });
});

describe('JobPayloadMap (type-level)', () => {
  it('keys each queue to its payload shape', () => {
    expectTypeOf<JobPayloadMap['ocr']>().toEqualTypeOf<{ receiptId: string }>();
    expectTypeOf<JobPayloadMap['categorize']>().toEqualTypeOf<{ transactionId: string }>();
    expectTypeOf<JobPayloadMap['recap']>().toMatchTypeOf<{ userId: string; month: string }>();
  });
});

// enqueue() validates the payload BEFORE touching Redis (ADR-029), so these
// throw synchronously and need no broker connection.
describe('enqueue payload validation', () => {
  it('rejects a malformed payload at the producer (no Redis needed)', () => {
    // receiptId must be a uuid.
    expect(() => enqueue('ocr', { receiptId: 'not-a-uuid' } as never)).toThrow();
    // recap month must be YYYY-MM.
    expect(() =>
      enqueue('recap', { userId: '00000000-0000-0000-0000-000000000001', month: '2026/05' } as never),
    ).toThrow();
  });
});

// Real enqueue against Redis (docker compose up). Skips cleanly if unreachable.
// Always tears down (closeQueues + closeRedisClient) so vitest exits with no
// open handles.
describe('enqueue (Redis)', () => {
  let online = false;

  beforeAll(async () => {
    try {
      // Race readiness against a short timeout — ioredis keeps retrying a down
      // broker rather than rejecting, which would otherwise hang this hook until
      // it times out. Lets the suite "skip cleanly if unreachable" as intended.
      await Promise.race([
        getQueue('categorize').waitUntilReady(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('redis timeout')), 2000)),
      ]);
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
    // The job exists in Redis under its deterministic id. Assert via getJob, NOT
    // the 'wait' count — a running worker drains the queue (moving the job out of
    // 'wait' into active/completed), which would otherwise flake this assertion.
    expect(await q.getJob(jobId)).toBeTruthy();

    await q.remove(jobId).catch(() => {});
  });
});
