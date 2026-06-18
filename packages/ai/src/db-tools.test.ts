import { describe, it, expect } from 'vitest';
import {
  netBalances,
  monthBounds,
  monthOf,
  monthsInRange,
  shapeTrend,
  type SplitRow,
  type ShareRow,
  type SettlementRow,
} from './tools/db-tools';

describe('monthBounds / monthOf', () => {
  it('computes UTC [start, next-month) bounds', () => {
    const { start, end } = monthBounds('2026-05');
    expect(start.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });
  it('rolls December into the next year', () => {
    const { start, end } = monthBounds('2026-12');
    expect(start.toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
  it('formats a date as YYYY-MM in UTC', () => {
    expect(monthOf(new Date('2026-05-09T23:00:00.000Z'))).toBe('2026-05');
  });
});

describe('netBalances (model B — ADR-028, exact integer cents)', () => {
  // The user owns one split; self holds a share (skipped), two friends owe shares.
  const SELF = 'self';
  const splits: SplitRow[] = [{ id: 's1', currency: 'USD' }];
  const shares: ShareRow[] = [
    { splitId: 's1', personId: SELF, amount: 2000 }, // the user's own share — skipped
    { splitId: 's1', personId: 'bob', amount: 1000 }, // bob owes $10.00
    { splitId: 's1', personId: 'carol', amount: 500 }, // carol owes $5.00
  ];

  it('each share-holder owes the user exact cents', () => {
    const { net } = netBalances(splits, shares, [], SELF);
    expect(net.get('bob')).toBe(1000);
    expect(net.get('carol')).toBe(500);
  });

  it('skips the self share and never emits a "You" balance', () => {
    const { net } = netBalances(splits, shares, [], SELF);
    expect(net.has(SELF)).toBe(false);
  });

  it("a settled settlement reduces that person's debt", () => {
    // Bob settles $10 → his +1000 nets to 0 and is dropped; carol unchanged.
    const settled: SettlementRow[] = [
      { fromPersonId: 'bob', toPersonId: SELF, amount: 1000, currency: 'USD' },
    ];
    const { net } = netBalances(splits, shares, settled, SELF);
    expect(net.has('bob')).toBe(false); // 1000 - 1000 = 0
    expect(net.get('carol')).toBe(500);
  });

  it('a partial settlement leaves the exact remaining debt', () => {
    const settled: SettlementRow[] = [
      { fromPersonId: 'bob', toPersonId: SELF, amount: 400, currency: 'USD' },
    ];
    const { net } = netBalances(splits, shares, settled, SELF);
    expect(net.get('bob')).toBe(600); // 1000 - 400
  });

  it('"you paid them" credits the friend (the direction the old code missed)', () => {
    // you paid bob $7 → from=self, to=bob. On top of bob's +1000 share → 1700.
    const settled: SettlementRow[] = [
      { fromPersonId: SELF, toPersonId: 'bob', amount: 700, currency: 'USD' },
    ];
    const { net } = netBalances(splits, shares, settled, SELF);
    expect(net.get('bob')).toBe(1700); // 1000 + 700 (old code wrongly left it at 1000)
  });

  it('aggregates a person across multiple splits', () => {
    const twoSplits: SplitRow[] = [
      { id: 's1', currency: 'USD' },
      { id: 's2', currency: 'USD' },
    ];
    const moreShares: ShareRow[] = [
      { splitId: 's1', personId: 'bob', amount: 1000 },
      { splitId: 's2', personId: 'bob', amount: 250 },
    ];
    const { net } = netBalances(twoSplits, moreShares, [], SELF);
    expect(net.get('bob')).toBe(1250);
  });

  it('carries the split currency per person', () => {
    const eurSplits: SplitRow[] = [{ id: 's2', currency: 'EUR' }];
    const eurShares: ShareRow[] = [{ splitId: 's2', personId: 'pia', amount: 250 }];
    const { net, currency } = netBalances(eurSplits, eurShares, [], SELF);
    expect(net.get('pia')).toBe(250);
    expect(currency.get('pia')).toBe('EUR');
  });
});

import { dayStartUTC, dayAfterUTC } from './tools/db-tools';

describe('date-range helpers', () => {
  it('dayStartUTC is midnight UTC of the given day', () => {
    expect(dayStartUTC('2026-05-10').toISOString()).toBe('2026-05-10T00:00:00.000Z');
  });
  it('dayAfterUTC is midnight UTC of the next day (for inclusive `to`)', () => {
    expect(dayAfterUTC('2026-05-10').toISOString()).toBe('2026-05-11T00:00:00.000Z');
  });
});

describe('monthsInRange', () => {
  it('lists inclusive months, rolling over the year', () => {
    expect(monthsInRange('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });
  it('caps the range length', () => {
    expect(monthsInRange('2020-01', '2030-01').length).toBe(24);
  });
  it('returns a single month when from === to', () => {
    expect(monthsInRange('2026-05', '2026-05')).toEqual(['2026-05']);
  });
});

describe('shapeTrend', () => {
  it('buckets rows by month and fills empty months with zero', () => {
    const out = shapeTrend(
      ['2026-04', '2026-05'],
      [{ month: '2026-05', category: 'dining', amountCents: 12345 }],
    );
    expect(out).toEqual([
      { month: '2026-04', totalCents: 0, byCategory: [] },
      { month: '2026-05', totalCents: 12345, byCategory: [{ category: 'dining', amountCents: 12345 }] },
    ]);
  });
});

import { toMonthlyRecap } from './tools/db-tools';

describe('toMonthlyRecap', () => {
  it('maps a core RecapResult to the tool shape', () => {
    const out = toMonthlyRecap('2026-05', {
      totalIncome: 300000,
      totalExpense: 17345,
      net: 282655,
      byCategory: [{ category: 'dining', amount: 12345 }, { category: 'groceries', amount: 5000 }],
      topMerchant: 'Market',
      skipped: 0,
    });
    expect(out).toEqual({
      month: '2026-05',
      incomeCents: 300000,
      expenseCents: 17345,
      netCents: 282655,
      byCategory: [{ category: 'dining', amountCents: 12345 }, { category: 'groceries', amountCents: 5000 }],
      topMerchant: 'Market',
    });
  });
});

import { subtotalByCurrency } from './tools/db-tools';

describe('subtotalByCurrency', () => {
  it('sums account balances per currency', () => {
    expect(
      subtotalByCurrency([
        { accountName: 'Checking', currency: 'USD', balanceCents: 10000 },
        { accountName: 'Savings', currency: 'USD', balanceCents: 25000 },
        { accountName: 'Euro', currency: 'EUR', balanceCents: 5000 },
      ]),
    ).toEqual([
      { currency: 'USD', totalCents: 35000 },
      { currency: 'EUR', totalCents: 5000 },
    ]);
  });
});
