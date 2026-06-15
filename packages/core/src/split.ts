import type { SplitMode } from '@spendlio/contracts';

export interface Share { personId: string; amount: number } // cents

/** Even split. Distributes the remainder cent(s) starting with the payer. */
export function splitEven(totalCents: number, personIds: string[], payerId: string): Share[] {
  const n = personIds.length;
  if (n === 0) throw new Error('no people to split with');
  const base = Math.floor(totalCents / n);
  let remainder = totalCents - base * n;            // 0..n-1
  const amount = new Map(personIds.map((id) => [id, base]));
  const order = [payerId, ...personIds.filter((id) => id !== payerId)];
  for (const id of order) { if (remainder <= 0) break; amount.set(id, amount.get(id)! + 1); remainder--; }
  return personIds.map((id) => ({ personId: id, amount: amount.get(id)! }));
}

/** Exact amounts must sum to the total. */
export function splitExact(totalCents: number, shares: Share[]): Share[] {
  const sum = shares.reduce((s, x) => s + x.amount, 0);
  if (sum !== totalCents) throw new Error(`exact shares (${sum}) must equal total (${totalCents})`);
  return shares;
}

/** Percentages (0..100) must sum to 100; remainder cent(s) go to the payer first. */
export function splitPercent(
  totalCents: number, percents: { personId: string; pct: number }[], payerId: string,
): Share[] {
  const pctSum = percents.reduce((s, p) => s + p.pct, 0);
  if (Math.round(pctSum) !== 100) throw new Error('percentages must sum to 100');
  const raw = percents.map((p) => ({ personId: p.personId, amount: Math.floor((totalCents * p.pct) / 100) }));
  let remainder = totalCents - raw.reduce((s, x) => s + x.amount, 0);
  const order = [payerId, ...raw.map((r) => r.personId).filter((id) => id !== payerId)];
  const map = new Map(raw.map((r) => [r.personId, r.amount]));
  for (const id of order) { if (remainder <= 0) break; map.set(id, map.get(id)! + 1); remainder--; }
  return raw.map((r) => ({ personId: r.personId, amount: map.get(r.personId)! }));
}

export function computeSplit(
  mode: SplitMode, totalCents: number, personIds: string[], payerId: string,
  detail?: { exact?: Share[]; percents?: { personId: string; pct: number }[] },
): Share[] {
  if (mode === 'even') return splitEven(totalCents, personIds, payerId);
  if (mode === 'exact') return splitExact(totalCents, detail?.exact ?? []);
  return splitPercent(totalCents, detail?.percents ?? [], payerId);
}
