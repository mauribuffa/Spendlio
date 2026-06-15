import { eq } from 'drizzle-orm';
import { db, transactions } from '@spendlio/db';
import { categorizeByRules, getProvider } from '@spendlio/ai';
import type { Job } from '@spendlio/queue';
import type { CategorizeJob } from '@spendlio/contracts';

/**
 * Categorization: text -> CategoryKey, rules-first.
 *  cheap deterministic keyword rules resolve the common cases for free; only the
 *  long tail falls through to the LLM provider. Writes transaction.category.
 *
 * Idempotent: writing the same category is a no-op; if neither rules nor the
 * model are confident we leave the existing category untouched. id-only payload.
 */
export async function processCategorize(job: Job<CategorizeJob>): Promise<void> {
  const { transactionId } = job.data;

  const [txn] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, transactionId))
    .limit(1);
  if (!txn) return;

  const title = txn.title;
  const merchant = txn.merchant ?? undefined;

  // 1) rules-first (free, deterministic)
  let category = categorizeByRules({ title, merchant });

  // 2) long tail -> provider (offline engine by default; LLM if a key is set)
  if (!category) {
    category = await getProvider().categorize({
      title,
      merchant,
      amount: txn.amount,
      currency: txn.currency,
    });
  }

  if (!category) return; // not confident enough — leave as-is

  await db
    .update(transactions)
    .set({ category, updatedAt: new Date() })
    .where(eq(transactions.id, transactionId));
}
