import { describe, it, expect } from 'vitest';
import { splitEven, splitExact, splitPercent, computeSplit, type Share } from './split';

const sum = (shares: Share[]) => shares.reduce((t, x) => t + x.amount, 0);

const peopleIds = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);

describe('splitEven', () => {
  it('splits $10.00 three ways with an exact, deterministic remainder', () => {
    const s = splitEven(1000, ['payer', 'b', 'c'], 'payer');
    expect(s.map((x) => x.amount)).toEqual([334, 333, 333]); // payer absorbs the extra cent
    expect(sum(s)).toBe(1000);                                // never loses a cent
  });

  it('gives the leftover cents to the payer first, then others in order', () => {
    // $10.00 / 4 = 250 each, no remainder
    expect(splitEven(1000, ['a', 'b', 'c', 'd'], 'a').map((x) => x.amount)).toEqual([250, 250, 250, 250]);
    // 1001 / 4 = 250 base, remainder 1 -> payer (b) gets the extra
    const s = splitEven(1001, ['a', 'b', 'c', 'd'], 'b');
    expect(s.find((x) => x.personId === 'b')!.amount).toBe(251);
    expect(s.filter((x) => x.personId !== 'b').map((x) => x.amount)).toEqual([250, 250, 250]);
    expect(sum(s)).toBe(1001);
  });

  it('distributes 2 leftover cents to payer then next person in input order', () => {
    // 1002 / 4 = 250 base, remainder 2. payer = 'c'. order: c, a, b, d
    const s = splitEven(1002, ['a', 'b', 'c', 'd'], 'c');
    const byId = new Map(s.map((x) => [x.personId, x.amount]));
    expect(byId.get('c')).toBe(251); // payer first
    expect(byId.get('a')).toBe(251); // next in input order
    expect(byId.get('b')).toBe(250);
    expect(byId.get('d')).toBe(250);
    expect(sum(s)).toBe(1002);
  });

  it('handles a single person (the payer takes everything)', () => {
    expect(splitEven(777, ['solo'], 'solo')).toEqual([{ personId: 'solo', amount: 777 }]);
  });

  it('throws when there is no one to split with', () => {
    expect(() => splitEven(1000, [], 'payer')).toThrow(/no people/);
  });

  it('preserves input order in the returned shares', () => {
    const ids = ['z', 'a', 'm'];
    expect(splitEven(900, ids, 'a').map((x) => x.personId)).toEqual(ids);
  });
});

describe('splitExact', () => {
  it('returns the shares unchanged when they sum to the total', () => {
    const shares: Share[] = [{ personId: 'a', amount: 600 }, { personId: 'b', amount: 400 }];
    expect(splitExact(1000, shares)).toEqual(shares);
  });

  it('throws when shares do not sum to the total', () => {
    const shares: Share[] = [{ personId: 'a', amount: 600 }, { personId: 'b', amount: 300 }];
    expect(() => splitExact(1000, shares)).toThrow(/must equal total/);
  });

  it('throws when shares overshoot the total', () => {
    expect(() => splitExact(1000, [{ personId: 'a', amount: 1001 }])).toThrow();
  });
});

describe('splitPercent', () => {
  it('100% across people equals the total', () => {
    const s = splitPercent(1000, [{ personId: 'payer', pct: 50 }, { personId: 'b', pct: 50 }], 'payer');
    expect(sum(s)).toBe(1000);
  });

  it('gives the leftover cent(s) to the payer first', () => {
    // 1000 * 1/3 floored = 333 each -> 999, remainder 1 goes to payer
    const s = splitPercent(
      1000,
      [{ personId: 'a', pct: 33.34 }, { personId: 'b', pct: 33.33 }, { personId: 'c', pct: 33.33 }],
      'b',
    );
    // floors: a=333, b=333, c=333 -> 999, remainder 1 -> payer 'b'
    const byId = new Map(s.map((x) => [x.personId, x.amount]));
    expect(byId.get('b')).toBe(334);
    expect(sum(s)).toBe(1000);
  });

  it('throws when percentages do not sum to 100', () => {
    expect(() => splitPercent(1000, [{ personId: 'a', pct: 60 }, { personId: 'b', pct: 30 }], 'a')).toThrow(
      /sum to 100/,
    );
  });

  it('throws when percentages exceed 100', () => {
    expect(() => splitPercent(1000, [{ personId: 'a', pct: 70 }, { personId: 'b', pct: 40 }], 'a')).toThrow();
  });
});

describe('computeSplit', () => {
  it('dispatches to even', () => {
    expect(computeSplit('even', 1000, ['a', 'b', 'c'], 'a')).toEqual(splitEven(1000, ['a', 'b', 'c'], 'a'));
  });

  it('dispatches to exact', () => {
    const exact: Share[] = [{ personId: 'a', amount: 1000 }];
    expect(computeSplit('exact', 1000, ['a'], 'a', { exact })).toEqual(exact);
  });

  it('dispatches to percent', () => {
    const percents = [{ personId: 'a', pct: 100 }];
    expect(computeSplit('percent', 1000, ['a'], 'a', { percents })).toEqual(
      splitPercent(1000, percents, 'a'),
    );
  });
});

// --- Property: EVERY split sums EXACTLY to the total (no lost/invented cents) ---
describe('property: splits conserve every cent', () => {
  const totals = [0, 1, 2, 3, 5, 7, 99, 100, 101, 333, 1000, 1001, 1002, 9999, 12345, 100000];

  it('splitEven sums exactly to the total for n = 1..20 and assorted totals', () => {
    for (let n = 1; n <= 20; n++) {
      const ids = peopleIds(n);
      for (const total of totals) {
        for (const payer of [ids[0]!, ids[n - 1]!, ids[Math.floor(n / 2)]!]) {
          const s = splitEven(total, ids, payer);
          expect(sum(s)).toBe(total);                 // no cent lost or invented
          expect(s).toHaveLength(n);                  // everyone gets a share
          expect(Math.max(...s.map((x) => x.amount)) - Math.min(...s.map((x) => x.amount)))
            .toBeLessThanOrEqual(1);                   // shares differ by at most one cent
        }
      }
    }
  });

  it('splitPercent sums exactly to the total for n = 1..20 and assorted totals', () => {
    for (let n = 1; n <= 20; n++) {
      const ids = peopleIds(n);
      // an even percentage spread that still sums to exactly 100
      const basePct = Math.floor((100 / n) * 100) / 100; // 2 dp
      const percents = ids.map((id) => ({ personId: id, pct: basePct }));
      // push the rounding remainder onto the first person so the pcts sum to 100
      const pctRemainder = Math.round((100 - basePct * n) * 100) / 100;
      percents[0]!.pct = Math.round((percents[0]!.pct + pctRemainder) * 100) / 100;
      expect(percents.reduce((t, p) => t + p.pct, 0)).toBeCloseTo(100, 6);
      for (const total of totals) {
        for (const payer of [ids[0]!, ids[n - 1]!]) {
          const s = splitPercent(total, percents, payer);
          expect(sum(s)).toBe(total);                 // no cent lost or invented
          expect(s).toHaveLength(n);
        }
      }
    }
  });
});
