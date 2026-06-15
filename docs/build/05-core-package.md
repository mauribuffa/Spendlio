# Build step 05 · `@spendlio/core`

Goal: the pure domain logic — money + the split engine + balance netting. No framework, no DB, fully unit-tested. This is where the "interesting" money math lives, once, correctly.

## Setup
```bash
mkdir -p packages/core/src
pnpm --filter @spendlio/core add @spendlio/contracts
pnpm --filter @spendlio/core add -D vitest
```
`package.json` scripts: `{ "test": "vitest run", "typecheck": "tsc --noEmit" }`. Add the standard `tsconfig.json`.

## Source

**`src/money.ts`** — re-export the contract helpers so `core` is the home of money math.
```ts
export { toMinorUnits, fromMinorUnits, formatMoney } from '@spendlio/contracts';
```

**`src/split.ts`** — the split engine. All integer cents; the leftover cent is deterministic (goes to the payer first, then others in order).
```ts
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
```

**`src/balances.ts`** — net who-owes-whom into one signed number per person.
```ts
export interface Edge { debtorId: string; creditorId: string; amount: number } // cents

/** Net balance per person from the viewpoint of `meId`: positive = others owe you. */
export function netForUser(edges: Edge[], meId: string): Map<string, number> {
  const net = new Map<string, number>();
  const bump = (id: string, d: number) => net.set(id, (net.get(id) ?? 0) + d);
  for (const e of edges) {
    if (e.creditorId === meId) bump(e.debtorId, e.amount);   // they owe you
    if (e.debtorId === meId) bump(e.creditorId, -e.amount);  // you owe them
  }
  return net;
}
```

**`src/index.ts`** — re-export `money`, `split`, `balances`.

## Tests — **`src/split.test.ts`**
```ts
import { describe, it, expect } from 'vitest';
import { splitEven, splitPercent } from './split';

describe('splitEven', () => {
  it('splits $10.00 three ways with an exact, deterministic remainder', () => {
    const s = splitEven(1000, ['payer', 'b', 'c'], 'payer');
    expect(s.map((x) => x.amount)).toEqual([334, 333, 333]); // payer absorbs the extra cent
    expect(s.reduce((t, x) => t + x.amount, 0)).toBe(1000);   // never loses a cent
  });
});

describe('splitPercent', () => {
  it('100% across people equals the total', () => {
    const s = splitPercent(1000, [{ personId: 'payer', pct: 50 }, { personId: 'b', pct: 50 }], 'payer');
    expect(s.reduce((t, x) => t + x.amount, 0)).toBe(1000);
  });
});
```

## Acceptance
```bash
pnpm --filter @spendlio/core test         # green
pnpm --filter @spendlio/core typecheck    # green
```
Key property to verify: **every split sums exactly to the total** (no lost or invented cents), for any person count.
