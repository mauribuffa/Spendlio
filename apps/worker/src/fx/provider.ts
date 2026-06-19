import { CURRENCY_DECIMALS } from '@spendlio/contracts';

/** A day's rates for one base: quote currency → exact rate string. */
export interface RatesResult {
  date: string; // YYYY-MM-DD
  rates: Record<string, string>;
}

export interface RatesProvider {
  /** Latest rates from `base` to each requested `quotes` (skips unknown quotes). */
  fetchRates(base: string, quotes: string[]): Promise<RatesResult>;
}

const FETCH_TIMEOUT_MS = 15_000;

/**
 * Deterministic offline provider — the default. A small static table (USD-hub),
 * derived for any base by ratio. Zero network; used in dev/CI/tests/seed parity.
 * Rates are illustrative, not market-accurate.
 */
const USD_TABLE: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, ARS: 950, BRL: 5.0, MXN: 17, CAD: 1.36,
  AUD: 1.5, CHF: 0.88, CNY: 7.1, INR: 83, JPY: 160, KRW: 1350, CLP: 950,
};
const OFFLINE_DATE = '2026-06-18';

export class OfflineRatesProvider implements RatesProvider {
  async fetchRates(base: string, quotes: string[]): Promise<RatesResult> {
    const b = USD_TABLE[base.toUpperCase()];
    const rates: Record<string, string> = {};
    if (b) {
      for (const q of quotes) {
        const v = USD_TABLE[q.toUpperCase()];
        if (v == null || q.toUpperCase() === base.toUpperCase()) continue;
        rates[q.toUpperCase()] = String(v / b); // base→quote via USD hub
      }
    }
    return { date: OFFLINE_DATE, rates };
  }
}

/** Live provider — Frankfurter (ECB data, free, no key). https://frankfurter.app */
export class FrankfurterRatesProvider implements RatesProvider {
  async fetchRates(base: string, quotes: string[]): Promise<RatesResult> {
    const to = quotes.map((q) => q.toUpperCase()).filter((q) => q !== base.toUpperCase()).join(',');
    const url = `https://api.frankfurter.app/latest?from=${base.toUpperCase()}&to=${to}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`frankfurter ${res.status}`);
    const json = (await res.json()) as { date: string; rates: Record<string, number> };
    const rates: Record<string, string> = {};
    for (const [q, v] of Object.entries(json.rates ?? {})) rates[q.toUpperCase()] = String(v);
    return { date: json.date, rates };
  }
}

/** All currencies we know minor units for — the quote set the cron fetches. */
export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_DECIMALS);

/** Offline by default; live only when FX_PROVIDER=frankfurter (mirrors the AI provider gating). */
export function getRatesProvider(): RatesProvider {
  return process.env.FX_PROVIDER === 'frankfurter'
    ? new FrankfurterRatesProvider()
    : new OfflineRatesProvider();
}
