import { describe, it, expect } from 'vitest';
import { computeRecap, type RecapTxn } from './recap';

const txn = (over: Partial<RecapTxn>): RecapTxn => ({
  amount: 0,
  currency: 'USD',
  category: 'dining',
  ...over,
});

describe('computeRecap', () => {
  it('sums income and expense in base currency, exact cents', () => {
    const r = computeRecap(
      [
        txn({ amount: 300000, category: 'income' }),
        txn({ amount: -8240, category: 'groceries', merchant: 'Whole Foods' }),
        txn({ amount: -575, category: 'dining', merchant: 'Blue Bottle' }),
      ],
      'USD',
    );
    expect(r.totalIncome).toBe(300000);
    expect(r.totalExpense).toBe(8815);
    expect(r.net).toBe(291185);
  });

  it('groups expense magnitude per category, sorted desc', () => {
    const r = computeRecap(
      [
        txn({ amount: -1000, category: 'dining' }),
        txn({ amount: -2500, category: 'groceries' }),
        txn({ amount: -500, category: 'dining' }),
      ],
      'USD',
    );
    expect(r.byCategory).toEqual([
      { category: 'groceries', amount: 2500 },
      { category: 'dining', amount: 1500 },
    ]);
  });

  it('picks the top merchant by spend', () => {
    const r = computeRecap(
      [
        txn({ amount: -1000, merchant: 'A' }),
        txn({ amount: -3000, merchant: 'B' }),
        txn({ amount: -500, merchant: 'B' }),
      ],
      'USD',
    );
    expect(r.topMerchant).toBe('B');
  });

  it('uses the FX snapshot for non-base currency, else skips and reports', () => {
    const r = computeRecap(
      [
        txn({ amount: -1000, currency: 'EUR', fxBaseAmount: -1100, category: 'travel' }), // counted via snapshot
        txn({ amount: -2000, currency: 'EUR', category: 'travel' }), // no snapshot → skipped
        txn({ amount: -500, currency: 'USD', category: 'dining' }),
      ],
      'USD',
    );
    expect(r.totalExpense).toBe(1600); // 1100 + 500
    expect(r.skipped).toBe(1);
  });
});
