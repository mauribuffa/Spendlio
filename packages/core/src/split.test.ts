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

  it('never loses a cent when the payer is not a participant', () => {
    // 1000 / 3 = 333 base, remainder 1. Payer 'OUTSIDER' holds no share, so the
    // leftover cent must land on the first real share-holder, not vanish.
    const s = splitEven(1000, ['a', 'b', 'c'], 'OUTSIDER');
    expect(s.map((x) => x.amount)).toEqual([334, 333, 333]);
    expect(sum(s)).toBe(1000);
  });

  it('prepends a self payer so it absorbs the remainder (model-B create path)', () => {
    // $96.00 across self + 2 friends: 9600 / 3 = 3200 each, no remainder.
    expect(splitEven(9600, ['self', 'alex', 'sam'], 'self').map((x) => x.amount)).toEqual([3200, 3200, 3200]);
    // 1000 / 3 = 333 base, remainder 1 -> self (payer, first) absorbs it.
    const s = splitEven(1000, ['self', 'a', 'b'], 'self');
    expect(s.find((x) => x.personId === 'self')!.amount).toBe(334);
    expect(sum(s)).toBe(1000);
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

  it('rejects a negative share even if the shares sum to the total', () => {
    // 1100 + (-100) = 1000, but a negative share is nonsense the sum check misses.
    const shares: Share[] = [{ personId: 'a', amount: 1100 }, { personId: 'b', amount: -100 }];
    expect(() => splitExact(1000, shares)).toThrow(/negative/);
  });

  it('rejects a duplicated person in the shares', () => {
    const shares: Share[] = [{ personId: 'a', amount: 600 }, { personId: 'a', amount: 400 }];
    expect(() => splitExact(1000, shares)).toThrow(/duplicate/);
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

  it('rejects a negative percentage even if the percentages sum to 100', () => {
    // 130 + (-30) = 100, but a negative pct would mint a negative share.
    expect(() =>
      splitPercent(1000, [{ personId: 'a', pct: 130 }, { personId: 'b', pct: -30 }], 'a'),
    ).toThrow(/negative/);
  });

  it('rejects a duplicated person (symmetric with splitExact)', () => {
    // Without the guard the Map would silently dedupe to a single 100% share.
    expect(() =>
      splitPercent(1000, [{ personId: 'a', pct: 50 }, { personId: 'a', pct: 50 }], 'a'),
    ).toThrow(/duplicate/);
  });

  it('accepts a sum within epsilon of 100 (floating-point tolerance)', () => {
    // 33.34 + 33.33 + 33.33 = 100.00000000000001 in IEEE-754; must not throw.
    const s = splitPercent(
      1000,
      [{ personId: 'a', pct: 33.34 }, { personId: 'b', pct: 33.33 }, { personId: 'c', pct: 33.33 }],
      'a',
    );
    expect(sum(s)).toBe(1000);
  });

  it('routes the remainder to a self payer holding a percent share', () => {
    // self 40% = 400, friend 60% floored = 600 -> sums to 1000 exactly here.
    const s = splitPercent(1000, [{ personId: 'self', pct: 40 }, { personId: 'a', pct: 60 }], 'self');
    expect(new Map(s.map((x) => [x.personId, x.amount])).get('self')).toBe(400);
    expect(sum(s)).toBe(1000);
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
