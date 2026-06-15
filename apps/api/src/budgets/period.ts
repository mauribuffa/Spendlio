import type { BudgetPeriod } from '@spendlio/contracts';

/**
 * UTC [start, end) bounds of the period that contains `now`.
 * - weekly:  Monday 00:00 UTC of the current ISO week
 * - monthly: first day of the current month
 * - yearly:  Jan 1 of the current year
 */
export function periodBounds(period: BudgetPeriod, now = new Date()): { start: Date; end: Date } {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  if (period === 'yearly') {
    return { start: new Date(Date.UTC(y, 0, 1)), end: new Date(Date.UTC(y + 1, 0, 1)) };
  }
  if (period === 'monthly') {
    return { start: new Date(Date.UTC(y, m, 1)), end: new Date(Date.UTC(y, m + 1, 1)) };
  }
  // weekly — Monday-based ISO week
  const day = now.getUTCDay(); // 0=Sun..6=Sat
  const mondayOffset = (day + 6) % 7; // days since Monday
  const start = new Date(Date.UTC(y, m, now.getUTCDate() - mondayOffset));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}
