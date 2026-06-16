import { getCurrencyDecimals } from '@spendlio/contracts';

/**
 * Compact whole-currency formatter for dashboard figures: no sign, no minor
 * units (e.g. "$1,234"). Per-currency decimals are honored so JPY/BHD scale
 * correctly. Shared by the home/insights/budgets pages (previously copied verbatim).
 */
export function formatWhole(cents: number, currency: string): string {
  const decimals = getCurrencyDecimals(currency);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.abs(cents) / 10 ** decimals);
}

/** Capitalize the first letter (e.g. a category key → a display label). */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
