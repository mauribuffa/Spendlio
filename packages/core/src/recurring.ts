/**
 * Pure cadence math for recurring rules — no DB, no framework.
 * Advances a run date by N cadence units (daily/weekly/monthly/yearly).
 */
export type Cadence = 'daily' | 'weekly' | 'monthly' | 'yearly';

export function advance(from: Date, cadence: Cadence, interval = 1): Date {
  const d = new Date(from.getTime());
  switch (cadence) {
    case 'daily':   d.setUTCDate(d.getUTCDate() + interval); break;
    case 'weekly':  d.setUTCDate(d.getUTCDate() + 7 * interval); break;
    case 'monthly': d.setUTCMonth(d.getUTCMonth() + interval); break;
    case 'yearly':  d.setUTCFullYear(d.getUTCFullYear() + interval); break;
  }
  return d;
}

/**
 * Catch-up: from `nextRunAt`, roll forward past `now`, returning the dates that
 * are now due (one materialization per missed occurrence) and the new nextRunAt.
 * Bounded so a long-dormant rule can't spawn unbounded transactions in one run.
 */
export function dueOccurrences(
  nextRunAt: Date,
  now: Date,
  cadence: Cadence,
  interval = 1,
  max = 60,
): { due: Date[]; nextRunAt: Date } {
  const due: Date[] = [];
  let cursor = new Date(nextRunAt.getTime());
  while (cursor.getTime() <= now.getTime() && due.length < max) {
    due.push(new Date(cursor.getTime()));
    cursor = advance(cursor, cadence, interval);
  }
  return { due, nextRunAt: cursor };
}
