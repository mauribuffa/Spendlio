/**
 * Pure helpers for the recap page. No framework / DOM imports — just date-string
 * math and integer-cents arithmetic, so they unit-test cleanly.
 */

/**
 * The last `count` calendar months ending at `month` (YYYY-MM), newest first.
 * Used to populate the month picker. Pure string math — no Date timezone traps.
 */
export function recentMonths(month: string, count: number): string[] {
  const [y = 0, m = 1] = month.split('-').map(Number);
  const out: string[] = [];
  let year = y;
  let mon = m; // 1-12
  for (let i = 0; i < count; i++) {
    out.push(`${year}-${String(mon).padStart(2, '0')}`);
    mon -= 1;
    if (mon === 0) {
      mon = 12;
      year -= 1;
    }
  }
  return out;
}

/**
 * `part` as a whole-number percent of `total` (both integer minor units),
 * clamped to 0–100. Returns 0 for non-positive parts or a zero/negative total.
 */
export function percentOfTotal(part: number, total: number): number {
  if (part <= 0 || total <= 0) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}
