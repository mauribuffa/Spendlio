import { z } from 'zod';

export const CurrencyCode = z.string().length(3).toUpperCase(); // ISO 4217
export type CurrencyCode = z.infer<typeof CurrencyCode>;

export const Money = z.object({
  amount: z.number().int(),   // minor units in `currency`; negative = expense
  currency: CurrencyCode,
});
export type Money = z.infer<typeof Money>;

// Minor-unit exponent per currency (NOT always 2: JPY=0, BHD=3). Default 2.
export const CURRENCY_DECIMALS: Record<string, number> = {
  USD:2,EUR:2,GBP:2,ARS:2,BRL:2,MXN:2,CAD:2,AUD:2,CHF:2,CNY:2,INR:2, JPY:0,KRW:0,CLP:0, BHD:3,KWD:3,TND:3,
};
export const getCurrencyDecimals = (c: string) => CURRENCY_DECIMALS[c.toUpperCase()] ?? 2;
export const toMinorUnits = (major: number, c: string) => Math.round(major * 10 ** getCurrencyDecimals(c));
export const fromMinorUnits = (m: Money) => m.amount / 10 ** getCurrencyDecimals(m.currency);
export const formatMoney = (m: Money, locale = 'en-US') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency: m.currency }).format(fromMinorUnits(m));

// FX (multi-currency) — see docs/learning/12-currency-and-fx.md
export const FxSnapshot = z.object({
  baseCurrency: CurrencyCode,
  baseAmount: z.number().int(),   // minor units in base currency
  rate: z.number(),               // original -> base rate used
  asOf: z.string(),               // YYYY-MM-DD
});
export type FxSnapshot = z.infer<typeof FxSnapshot>;
