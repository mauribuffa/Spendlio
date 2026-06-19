import { createWorker, closeRedisClient, getQueue, enqueue } from '@spendlio/queue';
import { pool } from '@spendlio/db';
import { processOcr } from './processors/ocr';
import { processCategorize } from './processors/categorize';
import { processRecurring } from './processors/recurring';
import { processRecap } from './processors/recap';
import { processNotify } from './processors/notify';
import { processFxRefresh } from './processors/fx';
import { isFinalAttempt, recordDeadLetter } from './lib/dead-letter';

/**
 * The worker app: BullMQ consumers for every pipeline. Separate process from
 * apps/api — imports core/db/queue/storage/ai/contracts, nothing from the API.
 * Each queue gets its own concurrency (OCR is IO-bound → higher).
 *
 * `lockDuration` on OCR sits above the provider timeout (90s, see ocr.ts) so a
 * slow-but-alive job keeps its lock instead of being handed to a second worker.
 */
const workers = [
  createWorker('ocr', processOcr, { concurrency: 5, lockDuration: 120_000 }),
  createWorker('categorize', processCategorize, { concurrency: 5 }),
  createWorker('recurring', processRecurring, { concurrency: 1 }),
  createWorker('recap', processRecap, { concurrency: 2 }),
  createWorker('notify', processNotify, { concurrency: 5 }),
  createWorker('fx', processFxRefresh, { concurrency: 1 }),
];

for (const w of workers) {
  w.on('completed', (job) => console.log(`[${w.name}] completed ${job.id}`));
  w.on('failed', (job, err) => {
    console.error(`[${w.name}] failed ${job?.id}: ${err?.message}`);
    // On the final attempt, route to the durable dead-letter queue + alert sink.
    if (job && isFinalAttempt(job)) void recordDeadLetter(w.name, job, err);
  });
}

console.log(`worker up — consuming: ${workers.map((w) => w.name).join(', ')}`);

// FX rates: a daily repeatable (06:00 UTC) + an immediate run so rates exist now.
// First (and only) actual cron in the app — BullMQ's job scheduler manages repeats.
void (async () => {
  try {
    await getQueue('fx').upsertJobScheduler('fx-daily', { pattern: '0 6 * * *' }, { name: 'fx', data: {} });
    await enqueue('fx', {});
    console.log('[fx] scheduled daily refresh + enqueued an immediate run');
  } catch (err) {
    console.error(`[fx] scheduling failed: ${(err as Error).message}`);
  }
})();

async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} — draining workers...`);
  await Promise.all(workers.map((w) => w.close()));
  await closeRedisClient();
  await pool.end();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
