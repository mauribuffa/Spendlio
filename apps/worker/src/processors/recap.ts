import { and, eq, gte, lt, isNull } from 'drizzle-orm';
import { db, users, transactions, monthlySummaries } from '@spendlio/db';
import type { Job } from '@spendlio/queue';
import type { RecapJob } from '@spendlio/contracts';
import { computeRecap, type RecapTxn } from '@spendlio/core';

/**
 * Build (or rebuild) a user's monthly recap into monthly_summaries.
 *  load the user's base currency + that month's (non-deleted) transactions ->
 *  aggregate in core-style pure math -> upsert the one row for (user, month).
 *
 * Idempotent: upsert on the (user_id, month) unique key, so re-running just
 * recomputes the same row. id-only payload ({ userId, month }).
 */
export async function processRecap(job: Job<RecapJob>): Promise<void> {
  const { userId, month } = job.data; // month = YYYY-MM

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return;

  const { start, end } = monthRange(month);
  // Defense in depth (enqueue already validates the YYYY-MM shape): never let a
  // bad range produce NaN bounds and overwrite a good recap with zeros.
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error(`recap: invalid month "${month}"`);
  }

  const rows = await db
    .select({
      amount: transactions.amount,
      currency: transactions.currency,
      category: transactions.category,
      merchant: transactions.merchant,
      fxBaseAmount: transactions.fxBaseAmount,
      fxBaseCurrency: transactions.fxBaseCurrency,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.occurredAt, start),
        lt(transactions.occurredAt, end),
        isNull(transactions.deletedAt),
      ),
    );

  const recap = computeRecap(rows as RecapTxn[], user.defaultCurrency);

  if (recap.skipped > 0) {
    console.log(`[recap] ${userId} ${month}: ${recap.skipped} txn(s) excluded (no base-currency snapshot)`);
  }

  const values = {
    userId,
    month,
    currency: user.defaultCurrency,
    totalIncome: recap.totalIncome,
    totalExpense: recap.totalExpense,
    net: recap.net,
    byCategory: recap.byCategory,
    topMerchant: recap.topMerchant,
    updatedAt: new Date(),
  };

  await db
    .insert(monthlySummaries)
    .values(values)
    .onConflictDoUpdate({
      target: [monthlySummaries.userId, monthlySummaries.month],
      set: values,
    });
}

/** [start, end) UTC bounds for a YYYY-MM month. */
function monthRange(month: string): { start: Date; end: Date } {
  const [yStr, mStr] = month.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start, end };
}
