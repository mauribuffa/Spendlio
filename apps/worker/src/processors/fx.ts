import { sql } from 'drizzle-orm';
import { db, users, fxRates } from '@spendlio/db';
import type { Job } from '@spendlio/queue';
import type { FxRefreshJob } from '@spendlio/contracts';
import { getRatesProvider, SUPPORTED_CURRENCIES } from '../fx/provider';

/**
 * Daily FX refresh. Fetches rates for each DISTINCT users.defaultCurrency → all
 * supported currencies and upserts fx_rates on (base, quote, date). Per-base
 * fetch guarantees every user's base↔account-currency pair exists directly, so
 * convertMinor needs no triangulation. Idempotent (upsert).
 */
export async function processFxRefresh(_job: Job<FxRefreshJob>): Promise<void> {
  const provider = getRatesProvider();

  const baseRows = await db.selectDistinct({ base: users.defaultCurrency }).from(users);
  const bases = [...new Set(baseRows.map((r) => r.base).filter(Boolean))];
  if (bases.length === 0) bases.push('USD');

  for (const base of bases) {
    const { date, rates } = await provider.fetchRates(base, SUPPORTED_CURRENCIES);
    const values = Object.entries(rates).map(([quote, rate]) => ({ base, quote, date, rate }));
    if (values.length === 0) continue;
    await db
      .insert(fxRates)
      .values(values)
      .onConflictDoUpdate({
        target: [fxRates.base, fxRates.quote, fxRates.date],
        set: { rate: sql`excluded.rate`, updatedAt: new Date() },
      });
    console.log(`[fx] upserted ${values.length} rates for base ${base} @ ${date}`);
  }
}
