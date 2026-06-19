import { eq } from 'drizzle-orm';
import { users, fxRates } from '@spendlio/db';
import type { DB as Database } from '@spendlio/db';
import { computeFxSnapshot, type RateRow } from '@spendlio/core';

/**
 * Build the transaction FX snapshot columns for an insert. Reads the user's base
 * currency + the global fx_rates, then defers to core. Returns the four
 * `fxBase*` fields (or all-null when same-currency / no rate — the row is then
 * reported by recap, never summed).
 */
export async function fxSnapshotFields(
  db: Database, userId: string, amountMinor: number, currency: string,
): Promise<{ fxBaseCurrency: string | null; fxBaseAmount: number | null; fxRate: string | null; fxAsOf: string | null }> {
  const [user] = await db.select({ base: users.defaultCurrency }).from(users).where(eq(users.id, userId)).limit(1);
  const base = user?.base ?? 'USD';
  if (currency.toUpperCase() === base.toUpperCase()) {
    return { fxBaseCurrency: null, fxBaseAmount: null, fxRate: null, fxAsOf: null };
  }
  const rates: RateRow[] = await db
    .select({ base: fxRates.base, quote: fxRates.quote, date: fxRates.date, rate: fxRates.rate })
    .from(fxRates);
  const snap = computeFxSnapshot(amountMinor, currency, base, rates);
  return snap
    ? snap
    : { fxBaseCurrency: null, fxBaseAmount: null, fxRate: null, fxAsOf: null };
}
