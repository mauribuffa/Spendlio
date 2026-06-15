import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, receipts } from '@spendlio/db';
import { getBlobStore } from '@spendlio/storage';
import { getProvider } from '@spendlio/ai';
import { enqueue } from '@spendlio/queue';
import type { Job } from '@spendlio/queue';
import type { OcrJob } from '@spendlio/contracts';

/**
 * OCR pipeline: receipt image -> structured data.
 *  load receipt -> fetch bytes from storage -> AI extractReceipt (validated by
 *  the provider against the contracts schema) -> persist parsed fields + raw OCR,
 *  set status 'parsed' -> enqueue categorize for the linked transaction.
 *
 * Idempotent: re-running re-derives from the stored image and overwrites the
 * same row; a missing/processed receipt is a no-op. id-only payload.
 */
export async function processOcr(job: Job<OcrJob>): Promise<void> {
  const { receiptId } = job.data;

  const [receipt] = await db.select().from(receipts).where(eq(receipts.id, receiptId)).limit(1);
  if (!receipt) {
    // Nothing to do — receipt was deleted before the job ran.
    return;
  }

  try {
    const bytes = await getBlobStore().getObject(receipt.imageKey);

    // Integrity: the client asserts a content hash before upload (untrusted). We
    // hold the only copy that has seen the bytes, so verify them here and refuse
    // to OCR a tampered/corrupted object. (Legacy rows without a hash skip this.)
    if (receipt.sha256) {
      const actual = createHash('sha256').update(bytes).digest('hex');
      if (actual !== receipt.sha256) {
        throw new Error(`receipt ${receiptId} content hash mismatch (expected ${receipt.sha256}, got ${actual})`);
      }
    }

    const result = await getProvider().extractReceipt({ key: receipt.imageKey, bytes });

    await db
      .update(receipts)
      .set({
        status: 'parsed',
        merchant: result.merchant,
        total: result.total,
        currency: result.currency,
        purchasedAt: result.date ? new Date(result.date) : null,
        ocr: result, // full structured result (line items + confidence) as JSONB
        updatedAt: new Date(),
      })
      .where(eq(receipts.id, receiptId));

    // Hand off to categorization for the linked transaction, if any.
    if (receipt.transactionId) {
      await enqueue('categorize', { transactionId: receipt.transactionId });
    }
  } catch (err) {
    // Only flip to 'failed' once BullMQ has exhausted its retries — otherwise the
    // receipt stays 'processing' between attempts. (The web's PollWhileProcessing
    // stops refreshing on any non-'processing' status, so an early 'failed' would
    // stick in the UI even though a retry is pending.) Mirror BullMQ's own retry
    // guard (`attemptsMade + 1 < opts.attempts`). Re-throw so backoff/retry apply.
    const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
    if (isFinalAttempt) {
      await db
        .update(receipts)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(receipts.id, receiptId));
    }
    throw err;
  }
}
