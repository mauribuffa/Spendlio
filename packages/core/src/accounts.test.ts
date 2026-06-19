import { describe, it, expect } from 'vitest';
import { sumNet, convertMinor, pickRate, type RateRow } from './accounts';

describe('sumNet', () => {
  it('nets signed minor-unit amounts', () => {
    expect(sumNet([1000, -250, -100])).toBe(650);
  });
  it('returns 0 for no transactions', () => {
    expect(sumNet([])).toBe(0);
  });
});

describe('pickRate', () => {
  const rows: RateRow[] = [
    { base: 'USD', quote: 'ARS', date: '2026-06-10', rate: '1000' },
    { base: 'USD', quote: 'ARS', date: '2026-06-14', rate: '1100' },
    { base: 'USD', quote: 'BRL', date: '2026-06-14', rate: '5.4' },
  ];

  it('picks the latest row for a direct pair (from -> to)', () => {
    const r = pickRate(rows, 'ARS', 'USD'); // account ARS -> base USD
    // direct row is USD->ARS; ARS->USD is the inverse, latest date wins
    expect(r).toEqual({ rate: '1100', date: '2026-06-14', invert: true });
  });

  it('picks a forward-oriented row when from is the stored base', () => {
    const r = pickRate(rows, 'USD', 'ARS'); // USD -> ARS forward
    expect(r).toEqual({ rate: '1100', date: '2026-06-14', invert: false });
  });

  it('returns null when no row connects the pair', () => {
    expect(pickRate(rows, 'ARS', 'EUR')).toBeNull();
  });
});

describe('convertMinor', () => {
  it('returns the same amount with rate 1 when currencies match', () => {
    const out = convertMinor(-1290, 'USD', 'USD', []);
    expect(out).toEqual({ amount: -1290, rateAsOf: null });
  });

  it('converts ARS minor units to USD minor units using the inverse of USD->ARS', () => {
    const rows: RateRow[] = [{ base: 'USD', quote: 'ARS', date: '2026-06-14', rate: '1100' }];
    const out = convertMinor(-1234500, 'ARS', 'USD', rows);
    expect(out.amount).toBe(-1122);
    expect(out.rateAsOf).toBe('2026-06-14');
  });

  it('converts using a forward USD->BRL rate', () => {
    const rows: RateRow[] = [{ base: 'USD', quote: 'BRL', date: '2026-06-14', rate: '5.4' }];
    const out = convertMinor(10000, 'USD', 'BRL', rows);
    expect(out.amount).toBe(54000);
  });

  it('returns null when no rate connects the pair', () => {
    const out = convertMinor(5000, 'BRL', 'USD', []);
    expect(out).toEqual({ amount: null, rateAsOf: null });
  });

  it('respects differing currency decimals (JPY has 0)', () => {
    const rows: RateRow[] = [{ base: 'USD', quote: 'JPY', date: '2026-06-14', rate: '150' }];
    const out = convertMinor(1000, 'USD', 'JPY', rows);
    expect(out.amount).toBe(1500);
  });
});

import { computeFxSnapshot } from './accounts';

describe('computeFxSnapshot', () => {
  const rows = [{ base: 'USD', quote: 'ARS', date: '2026-06-18', rate: '950' }];

  it('returns null when the txn currency already equals the base', () => {
    expect(computeFxSnapshot(10000, 'USD', 'USD', rows)).toBeNull();
  });

  it('returns null when no rate connects the pair', () => {
    expect(computeFxSnapshot(10000, 'BRL', 'USD', rows)).toBeNull();
  });

  it('snapshots an ARS expense into USD (inverse rate), rounded to USD minor units', () => {
    // -950000 minor ARS = -9500.00 ARS; ÷ 950 = -10.00 USD = -1000 minor USD
    expect(computeFxSnapshot(-950000, 'ARS', 'USD', rows)).toEqual({
      fxBaseCurrency: 'USD',
      fxBaseAmount: -1000,
      fxRate: '950',
      fxAsOf: '2026-06-18',
    });
  });
});
