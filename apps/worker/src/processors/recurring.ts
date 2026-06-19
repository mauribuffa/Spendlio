import { and, eq, lte } from 'drizzle-orm';
import { db, recurringRules, transactions, users, fxRates } from '@spendlio/db';
import type { Job } from '@spendlio/queue';
import type { RecurringJob } from '@spendlio/queue';
import { dueOccurrences, computeFxSnapshot, type Cadence, type RateRow } from '@spendlio/core';

/**
 * Materialize due recurring transactions.
 *  cron (no ruleId) sweeps every active rule with nextRunAt <= now; a ruleId
 *  scopes to one. For each due occurrence we insert a transaction (source
 *  'recurring', linked via recurringId), then advance nextRunAt/lastRunAt.
 *
 * Idempotent: a partial unique index on (recurring_id, occurred_at) +
 * onConflictDoNothing guarantees a re-run (or a concurrent sweep) never
 * double-materializes money. The pre-SELECT below stays as a cheap fast-path.
 */
export async function processRecurring(job: Job<RecurringJob>): Promise<void> {
  const now = new Date();
  const ruleId = job.data?.ruleId;

  const rules = ruleId
    ? await db.select().from(recurringRules).where(eq(recurringRules.id, ruleId)).limit(1)
    : await db
        .select()
        .from(recurringRules)
        .where(and(eq(recurringRules.active, true), lte(recurringRules.nextRunAt, now)));

  const rates: RateRow[] = await db
    .select({ base: fxRates.base, quote: fxRates.quote, date: fxRates.date, rate: fxRates.rate })
    .from(fxRates);

  for (const rule of rules) {
    if (!rule.active) continue;

    const { due, nextRunAt } = dueOccurrences(
      rule.nextRunAt,
      now,
      rule.cadence as Cadence,
      Number(rule.interval),
    );
    if (due.length === 0) continue;

    for (const occurredAt of due) {
      const exists = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(and(eq(transactions.recurringId, rule.id), eq(transactions.occurredAt, occurredAt)))
        .limit(1);
      if (exists.length > 0) continue; // already materialized — skip

      const [u] = await db.select({ base: users.defaultCurrency }).from(users).where(eq(users.id, rule.userId)).limit(1);
      const fx = computeFxSnapshot(rule.amount, rule.currency, u?.base ?? 'USD', rates)
        ?? { fxBaseCurrency: null, fxBaseAmount: null, fxRate: null, fxAsOf: null };

      await db.insert(transactions).values({
        userId: rule.userId,
        title: rule.title,
        merchant: rule.merchant,
        amount: rule.amount,
        currency: rule.currency,
        category: rule.category,
        accountId: rule.accountId,
        occurredAt,
        status: 'cleared',
        source: 'recurring',
        recurringId: rule.id,
        ...fx,
      }).onConflictDoNothing();
    }

    await db
      .update(recurringRules)
      .set({ nextRunAt, lastRunAt: now, updatedAt: now })
      .where(eq(recurringRules.id, rule.id));
  }
}
