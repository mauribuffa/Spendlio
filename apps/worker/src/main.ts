import { createWorker, closeRedisClient } from '@spendlio/queue';
import { pool } from '@spendlio/db';
import { processOcr } from './processors/ocr';
import { processCategorize } from './processors/categorize';
import { processRecurring } from './processors/recurring';
import { processRecap } from './processors/recap';
import { processNotify } from './processors/notify';

/**
 * The worker app: BullMQ consumers for every pipeline. Separate process from
 * apps/api — imports core/db/queue/storage/ai/contracts, nothing from the API.
 * Each queue gets its own concurrency (OCR is IO-bound → higher).
 */
const workers = [
  createWorker('ocr', processOcr, { concurrency: 5 }),
  createWorker('categorize', processCategorize, { concurrency: 5 }),
  createWorker('recurring', processRecurring, { concurrency: 1 }),
  createWorker('recap', processRecap, { concurrency: 2 }),
  createWorker('notify', processNotify, { concurrency: 5 }),
];

for (const w of workers) {
  w.on('completed', (job) => console.log(`[${w.name}] completed ${job.id}`));
  w.on('failed', (job, err) => console.error(`[${w.name}] failed ${job?.id}: ${err?.message}`));
}

console.log(`worker up — consuming: ${workers.map((w) => w.name).join(', ')}`);

async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} — draining workers...`);
  await Promise.all(workers.map((w) => w.close()));
  await closeRedisClient();
  await pool.end();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
