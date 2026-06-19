import { getCurrencyDecimals } from '@spendlio/contracts';

/** Net of signed minor-unit amounts (all in the same currency). */
export function sumNet(amountsMinor: number[]): number {
  return amountsMinor.reduce((t, x) => t + x, 0);
}

/** A row from the global fx_rates table: 1 `base` = `rate` `quote` on `date`. */
export interface RateRow {
  base: string;
  quote: string;
  date: string; // YYYY-MM-DD
  rate: string; // exact decimal string
}

/** A resolved rate to apply when converting `from` -> `to`. */
export interface PickedRate {
  rate: string;
  date: string;
  /** When true, divide by the rate (the stored row is `to`->`from`). */
  invert: boolean;
}

/**
 * Find the latest-dated fx_rates row connecting `from` and `to`, in either
 * orientation. A forward row (base=from, quote=to) is applied as-is; a reverse
 * row (base=to, quote=from) is applied inverted. Latest `date` wins. Null when
 * no row connects the pair.
 */
export function pickRate(rows: RateRow[], from: string, to: string): PickedRate | null {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  let best: PickedRate | null = null;
  for (const row of rows) {
    const b = row.base.toUpperCase();
    const q = row.quote.toUpperCase();
    let invert: boolean | null = null;
    if (b === f && q === t) invert = false;
    else if (b === t && q === f) invert = true;
    if (invert === null) continue;
    if (!best || row.date > best.date) best = { rate: row.rate, date: row.date, invert };
  }
  return best;
}

/**
 * Convert `amountMinor` (minor units of `from`) into minor units of `to` using
 * the latest connecting rate in `rows`. Same currency returns the input
 * unchanged (rateAsOf null). No connecting rate returns { amount: null }.
 * Works at full float precision on the rate, rounding to `to`'s minor units.
 */
export function convertMinor(
  amountMinor: number,
  from: string,
  to: string,
  rows: RateRow[],
): { amount: number | null; rateAsOf: string | null } {
  if (from.toUpperCase() === to.toUpperCase()) return { amount: amountMinor, rateAsOf: null };

  const picked = pickRate(rows, from, to);
  if (!picked) return { amount: null, rateAsOf: null };

  const rate = Number(picked.rate);
  const factor = picked.invert ? 1 / rate : rate;

  const fromMajor = amountMinor / 10 ** getCurrencyDecimals(from);
  const toMajor = fromMajor * factor;
  const toMinor = Math.round(toMajor * 10 ** getCurrencyDecimals(to));
  return { amount: toMinor, rateAsOf: picked.date };
}

/**
 * A transaction's FX snapshot to the base currency, stored at entry time.
 * Named `TxnFxSnapshot` (not `FxSnapshot`) to avoid shadowing the contracts
 * `FxSnapshot` Zod schema; field names match the DB columns so they spread
 * straight into the transactions insert.
 */
export interface TxnFxSnapshot {
  fxBaseCurrency: string;
  fxBaseAmount: number; // minor units in base currency (signed)
  fxRate: string;       // the exact rate string used
  fxAsOf: string;       // YYYY-MM-DD of the rate
}

/**
 * Compute the base-currency snapshot for a transaction. Returns null when the
 * transaction is already in the base currency (no snapshot needed) or when no
 * rate connects the pair (caller stores nulls; the row is reported, not summed).
 */
export function computeFxSnapshot(
  amountMinor: number,
  currency: string,
  baseCurrency: string,
  rates: RateRow[],
): TxnFxSnapshot | null {
  if (currency.toUpperCase() === baseCurrency.toUpperCase()) return null;
  const picked = pickRate(rates, currency, baseCurrency);
  if (!picked) return null;
  const { amount } = convertMinor(amountMinor, currency, baseCurrency, rates);
  if (amount === null) return null;
  return { fxBaseCurrency: baseCurrency, fxBaseAmount: amount, fxRate: picked.rate, fxAsOf: picked.date };
}
