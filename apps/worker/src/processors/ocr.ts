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
    // Mark failed so the client stops polling 'processing'; BullMQ still records
    // the failure for retry/inspection. Re-throw so attempts/backoff apply.
    await db
      .update(receipts)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(receipts.id, receiptId));
    throw err;
  }
}
