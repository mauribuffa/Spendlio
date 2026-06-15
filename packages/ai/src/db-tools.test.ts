import { describe, it, expect } from 'vitest';
import {
  netBalances,
  monthBounds,
  monthOf,
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

describe('netBalances (ADR-021 model B, exact integer cents)', () => {
  // The user owns one split (user is the implicit creditor); two friends owe shares.
  const splits: SplitRow[] = [{ id: 's1', currency: 'USD' }];
  const shares: ShareRow[] = [
    { splitId: 's1', personId: 'bob', amount: 1000 }, // bob owes $10.00
    { splitId: 's1', personId: 'carol', amount: 500 }, // carol owes $5.00
  ];

  it('each share-holder owes the user exact cents', () => {
    const { net } = netBalances(splits, shares, []);
    expect(net.get('bob')).toBe(1000);
    expect(net.get('carol')).toBe(500);
  });

  it("a settled settlement reduces that person's debt", () => {
    // Bob settles $10 → his +1000 nets to 0 and is dropped; carol unchanged.
    const settled: SettlementRow[] = [
      { fromPersonId: 'bob', toPersonId: 'anyone', amount: 1000, currency: 'USD' },
    ];
    const { net } = netBalances(splits, shares, settled);
    expect(net.has('bob')).toBe(false); // 1000 - 1000 = 0
    expect(net.get('carol')).toBe(500);
  });

  it('a partial settlement leaves the exact remaining debt', () => {
    const settled: SettlementRow[] = [
      { fromPersonId: 'bob', toPersonId: 'anyone', amount: 400, currency: 'USD' },
    ];
    const { net } = netBalances(splits, shares, settled);
    expect(net.get('bob')).toBe(600); // 1000 - 400
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
    const { net } = netBalances(twoSplits, moreShares, []);
    expect(net.get('bob')).toBe(1250);
  });

  it('carries the split currency per person', () => {
    const eurSplits: SplitRow[] = [{ id: 's2', currency: 'EUR' }];
    const eurShares: ShareRow[] = [{ splitId: 's2', personId: 'pia', amount: 250 }];
    const { net, currency } = netBalances(eurSplits, eurShares, []);
    expect(net.get('pia')).toBe(250);
    expect(currency.get('pia')).toBe('EUR');
  });
});
