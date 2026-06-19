import { describe, it, expect } from 'vitest';
import { OfflineRatesProvider, getRatesProvider } from './provider';

describe('OfflineRatesProvider', () => {
  it('returns deterministic USD→quote rates and skips the base itself', async () => {
    const r = await new OfflineRatesProvider().fetchRates('USD', ['EUR', 'ARS', 'USD']);
    expect(r.date).toBe('2026-06-18');
    expect(r.rates.EUR).toBe('0.92');
    expect(r.rates.ARS).toBe('950');
    expect(r.rates.USD).toBeUndefined();
  });
  it('derives a non-USD base by ratio (EUR→USD)', async () => {
    const r = await new OfflineRatesProvider().fetchRates('EUR', ['USD']);
    expect(Number(r.rates.USD)).toBeCloseTo(1 / 0.92, 5);
  });
  it('defaults to the offline provider without FX_PROVIDER set', () => {
    expect(getRatesProvider().constructor.name).toBe('OfflineRatesProvider');
  });
});
