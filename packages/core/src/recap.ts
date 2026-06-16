import type { CategoryKey } from '@spendlio/contracts';

/**
 * Pure recap aggregation — no DB, no framework (a job's "work" lives in core).
 * All amounts are integer minor units (cents).
 *
 * Convention: each transaction is reduced to a single amount IN THE BASE
 * CURRENCY using its FX snapshot when present (fxBaseAmount), else its own
 * amount when its currency already equals the base. Transactions in a non-base
 * currency with no snapshot are skipped (can't be summed exactly) and reported.
 */
export interface RecapTxn {
  amount: number;        // minor units, original currency (signed: negative = expense)
  currency: string;
  category: CategoryKey;
  merchant?: string | null;
  fxBaseAmount?: number | null; // minor units in base currency (signed), if snapshotted
}

export interface RecapResult {
  totalIncome: number;   // minor units, base currency
  totalExpense: number;  // minor units, base currency (positive magnitude)
  net: number;           // income - expense
  byCategory: { category: CategoryKey; amount: number }[]; // expense magnitude per category
  topMerchant: string | null;
  skipped: number;       // txns dropped for lack of a base-currency value
}

export function computeRecap(txns: RecapTxn[], baseCurrency: string): RecapResult {
  let totalIncome = 0;
  let totalExpense = 0;
  const byCategory = new Map<CategoryKey, number>();
  const merchantSpend = new Map<string, number>();
  let skipped = 0;

  for (const t of txns) {
    const base = baseAmount(t, baseCurrency);
    if (base === null) {
      skipped += 1;
      continue;
    }
    if (base >= 0) {
      totalIncome += base;
    } else {
      const magnitude = -base;
      totalExpense += magnitude;
      byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + magnitude);
      if (t.merchant) merchantSpend.set(t.merchant, (merchantSpend.get(t.merchant) ?? 0) + magnitude);
    }
  }

  let topMerchant: string | null = null;
  let topSpend = -1;
  for (const [merchant, spend] of merchantSpend) {
    if (spend > topSpend) {
      topSpend = spend;
      topMerchant = merchant;
    }
  }

  return {
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    byCategory: [...byCategory.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
    topMerchant,
    skipped,
  };
}

/** Resolve a transaction's amount in the base currency, or null if impossible. */
function baseAmount(t: RecapTxn, baseCurrency: string): number | null {
  if (t.fxBaseAmount != null) return t.fxBaseAmount;
  if (t.currency === baseCurrency) return t.amount;
  return null;
}
