# FX / Multi-Currency Totals — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate `fx_rates` (a `RatesProvider` + a daily cron), write the transaction FX snapshot on create, and light up converted totals for account balances, the recap, and the assistant — resolving ADR-016.

**Architecture:** Pure FX math lives in `@spendlio/core` (`convertMinor`/`pickRate` already there; add `computeFxSnapshot` + make `computeRecap` base-aware). A `RatesProvider` (offline static default + live Frankfurter adapter, env-gated) lives in `apps/worker` and feeds a daily `fx` cron job that upserts `fx_rates` **per distinct user base**. The API writes the snapshot on transaction create by reading the global `fx_rates` + calling core. No migration (the `fx_rates` table + transaction `fxBase*` columns already exist).

**Tech Stack:** TypeScript (strict), Drizzle (Postgres), BullMQ (`upsertJobScheduler`), Zod, NestJS, Vitest, `fetch` (Frankfurter, free/no-key).

**Spec:** `docs/superpowers/specs/2026-06-19-fx-multi-currency-design.md`
**Branch:** `feat/fx-multi-currency` (spec already committed there).

---

## Conventions
- `@spendlio/core` and `@spendlio/contracts` stay framework/DB/network-free (golden rule #1).
- Money is signed integer **minor units**; conversion rounds **half-up to the target currency's** minor units (already how `convertMinor` works via `Math.round` + `getCurrencyDecimals`).
- Rates are exact decimal **strings**; `fx_rates` uniq is `(base, quote, date)`.
- After each task: `pnpm --filter @spendlio/<pkg> typecheck` + its `test` must be green before committing.
- Unit tests live next to source (`*.test.ts`); DB-backed proofs are `DATABASE_URL`-gated integration files (skipped by default), matching `@spendlio/ai`'s split. `apps/api`/`apps/web`/`apps/worker` have **no Vitest runner** — verify those via `typecheck` + the integration/live gate (per the locked surgical-test policy).

## Scope note (deviation from spec, intentional)
The spec listed a recap **"N excluded (no rate)"** badge. Surfacing that in the UI requires persisting a `skipped` count → a new `monthly_summaries` column → a migration, which the spec also forbids. Resolution: this plan delivers **correct snapshot-based recap totals** (the real win) and **logs** `skipped` in the recap worker for observability; the user-facing badge is **deferred** to a follow-up that adds the column. Recorded in Task 11's ADR + PROGRESS.

---

## Task 1: `core` — `computeFxSnapshot` (pure)

**Files:**
- Modify: `packages/core/src/accounts.ts`
- Test: `packages/core/src/accounts.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `packages/core/src/accounts.test.ts`:

```ts
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
```

- [ ] **Step 2: Run → fail**

Run: `pnpm --filter @spendlio/core test -- src/accounts.test.ts`
Expected: FAIL — `computeFxSnapshot` not exported.

- [ ] **Step 3: Implement**

In `packages/core/src/accounts.ts`, add (it reuses the existing `pickRate`/`convertMinor`/`RateRow`):

```ts
/** A transaction's FX snapshot to the base currency, stored at entry time. */
export interface FxSnapshot {
  fxBaseCurrency: string;
  fxBaseAmount: number; // minor units in base currency (signed)
  fxRate: string;       // the exact rate string used
  fxAsOf: string;       // YYYY-MM-DD of the rate
}

/**
 * Compute the base-currency snapshot for a transaction. Returns null when the
 * transaction is already in the base currency (no snapshot needed) or when no
 * rate connects the pair (caller stores nulls; the row is reported, not summed).
 */
export function computeFxSnapshot(
  amountMinor: number,
  currency: string,
  baseCurrency: string,
  rates: RateRow[],
): FxSnapshot | null {
  if (currency.toUpperCase() === baseCurrency.toUpperCase()) return null;
  const picked = pickRate(rates, currency, baseCurrency);
  if (!picked) return null;
  const { amount } = convertMinor(amountMinor, currency, baseCurrency, rates);
  if (amount === null) return null;
  return { fxBaseCurrency: baseCurrency, fxBaseAmount: amount, fxRate: picked.rate, fxAsOf: picked.date };
}
```

- [ ] **Step 4: Run → pass**

Run: `pnpm --filter @spendlio/core test -- src/accounts.test.ts`
Expected: PASS (3 new + existing green).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/accounts.ts packages/core/src/accounts.test.ts
git commit -m "feat(core): computeFxSnapshot — base-currency snapshot for a transaction"
```

---

## Task 2: `core` — base-aware `computeRecap`

Today `computeRecap` uses `fxBaseAmount` whenever present, even if that snapshot is in a *different* base than requested (stale after a base-currency change). Make it use a snapshot **only when its `fxBaseCurrency` matches** the requested base; otherwise the row counts as `skipped`.

**Files:**
- Modify: `packages/core/src/recap.ts`
- Test: `packages/core/src/recap.test.ts`

- [ ] **Step 1: Write failing test**

Append to `packages/core/src/recap.test.ts`:

```ts
import { computeRecap } from './recap';

describe('computeRecap base-awareness', () => {
  it('uses a snapshot only when its fxBaseCurrency matches the requested base', () => {
    const txns = [
      { amount: -950000, currency: 'ARS', category: 'dining' as const, merchant: 'Cafe',
        fxBaseAmount: -1000, fxBaseCurrency: 'USD' }, // snapshot in USD → used
      { amount: -500000, currency: 'ARS', category: 'dining' as const, merchant: 'Bar',
        fxBaseAmount: -3, fxBaseCurrency: 'EUR' },    // snapshot in EUR → NOT used → skipped
    ];
    const r = computeRecap(txns, 'USD');
    expect(r.totalExpense).toBe(1000); // only the USD-snapshot row
    expect(r.skipped).toBe(1);         // the EUR-snapshot row excluded
  });
});
```

- [ ] **Step 2: Run → fail**

Run: `pnpm --filter @spendlio/core test -- src/recap.test.ts`
Expected: FAIL — `RecapTxn` has no `fxBaseCurrency`, so the EUR row is wrongly summed (totalExpense 1003, skipped 0).

- [ ] **Step 3: Implement**

In `packages/core/src/recap.ts`:
- Add `fxBaseCurrency?: string | null;` to the `RecapTxn` interface (after `fxBaseAmount`).
- Change the private `baseAmount` to require a base match:

```ts
function baseAmount(t: RecapTxn, baseCurrency: string): number | null {
  if (t.fxBaseAmount != null && (t.fxBaseCurrency ?? baseCurrency) === baseCurrency) return t.fxBaseAmount;
  if (t.currency === baseCurrency) return t.amount;
  return null;
}
```

(The `?? baseCurrency` keeps older rows that have an amount but no recorded base working as before.)

- [ ] **Step 4: Run → pass**

Run: `pnpm --filter @spendlio/core test -- src/recap.test.ts`
Expected: PASS.

- [ ] **Step 5: Update the recap worker to pass + log the new field**

In `apps/worker/src/processors/recap.ts`, add `fxBaseCurrency: transactions.fxBaseCurrency` to the `.select({...})` (so `RecapTxn.fxBaseCurrency` is populated), and after `const recap = computeRecap(...)` add:

```ts
    if (recap.skipped > 0) {
      console.log(`[recap] ${userId} ${month}: ${recap.skipped} txn(s) excluded (no base-currency snapshot)`);
    }
```

- [ ] **Step 6: typecheck + commit**

Run: `pnpm --filter @spendlio/core test && pnpm --filter @spendlio/core typecheck && pnpm --filter @spendlio/worker typecheck`
Expected: clean + green.

```bash
git add packages/core/src/recap.ts packages/core/src/recap.test.ts apps/worker/src/processors/recap.ts
git commit -m "feat(core): base-aware computeRecap (use snapshot only on base match) + worker logs skipped"
```

---

## Task 3: `contracts` — the `fx` queue + job

**Files:**
- Modify: `packages/contracts/src/jobs.ts`
- Modify: `packages/queue/src/jobs.ts` (JobPayloadMap)
- Modify: `packages/queue/src/queues.ts` (JOB_SCHEMAS + defaultJobId)
- Test: `packages/contracts/src/contracts.test.ts` (or the existing contracts test file)

- [ ] **Step 1: Add the queue + payload to contracts**

In `packages/contracts/src/jobs.ts`:
- Add `fx: 'fx',` to the `QUEUES` object.
- Add the payload (parameterless — the job fetches for all distinct user bases):

```ts
// FX rates refresh — parameterless daily cron; the worker fetches for each
// distinct users.defaultCurrency and upserts fx_rates. id-only/empty payload.
export const FxRefreshJob = z.object({});
export type FxRefreshJob = z.infer<typeof FxRefreshJob>;
```

- [ ] **Step 2: Wire the payload map + schemas + jobId**

- `packages/queue/src/jobs.ts`: import `FxRefreshJob`, add `fx: FxRefreshJob;` to `JobPayloadMap`, and re-export `FxRefreshJob` in the `export type { ... }` line.
- `packages/queue/src/queues.ts`: import `FxRefreshJob` from `@spendlio/contracts`; add `fx: FxRefreshJob,` to `JOB_SCHEMAS`; add a case to `defaultJobId`: `case 'fx': return 'fx-refresh';`.

- [ ] **Step 3: Test the new schema + a smoke of the registry**

Add to the contracts test file:

```ts
import { QUEUES, FxRefreshJob } from './jobs';
describe('fx job', () => {
  it('registers the fx queue', () => { expect(QUEUES.fx).toBe('fx'); });
  it('accepts an empty payload', () => { expect(FxRefreshJob.safeParse({}).success).toBe(true); });
});
```

- [ ] **Step 4: Verify**

Run: `pnpm --filter @spendlio/contracts test && pnpm --filter @spendlio/contracts typecheck && pnpm --filter @spendlio/queue typecheck`
Expected: clean + green.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/jobs.ts packages/queue/src/jobs.ts packages/queue/src/queues.ts packages/contracts/src/contracts.test.ts
git commit -m "feat(contracts/queue): register the fx rates-refresh job"
```

---

## Task 4: `apps/worker` — the `RatesProvider` (offline default + live Frankfurter)

**Files:**
- Create: `apps/worker/src/fx/provider.ts`
- Create: `apps/worker/src/fx/provider.test.ts`

> `apps/worker` has no Vitest runner today. Add a minimal one so the offline provider (pure, deterministic) is unit-tested: create `apps/worker/vitest.config.ts` (copy `packages/ai/vitest.config.ts`) and a `"test": "vitest run"` script in `apps/worker/package.json`. If that proves to pull in DB-touching files, scope the config's `include` to `src/fx/**`. (The live adapter is exercised only via the manual gate in Task 11.)

- [ ] **Step 1: Write the provider + offline table**

Create `apps/worker/src/fx/provider.ts`:

```ts
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
```

- [ ] **Step 2: Write the offline-provider test**

Create `apps/worker/src/fx/provider.test.ts`:

```ts
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
```

- [ ] **Step 3: Run → pass** (after adding the vitest config/script)

Run: `pnpm --filter @spendlio/worker test -- src/fx/provider.test.ts`
Expected: PASS (3).

- [ ] **Step 4: typecheck + commit**

Run: `pnpm --filter @spendlio/worker typecheck`

```bash
git add apps/worker/src/fx/provider.ts apps/worker/src/fx/provider.test.ts apps/worker/vitest.config.ts apps/worker/package.json
git commit -m "feat(worker): RatesProvider — offline default + live Frankfurter adapter"
```

---

## Task 5: `apps/worker` — the `fx` cron processor + scheduler

**Files:**
- Create: `apps/worker/src/processors/fx.ts`
- Modify: `apps/worker/src/main.ts`
- Test (integration, `DATABASE_URL`-gated): `apps/worker/src/processors/fx.integration.test.ts`

- [ ] **Step 1: Write the processor**

Create `apps/worker/src/processors/fx.ts`:

```ts
import { sql } from 'drizzle-orm';
import { db, users, fxRates } from '@spendlio/db';
import type { Job } from '@spendlio/queue';
import type { FxRefreshJob } from '@spendlio/contracts';
import { getRatesProvider, SUPPORTED_CURRENCIES } from '../fx/provider';

/**
 * Daily FX refresh. Fetches rates for each DISTINCT users.defaultCurrency → all
 * supported currencies and upserts fx_rates on (base, quote, date). Per-base
 * fetch guarantees every user's base↔account-currency pair exists directly, so
 * convertMinor needs no triangulation. Idempotent (upsert).
 */
export async function processFxRefresh(_job: Job<FxRefreshJob>): Promise<void> {
  const provider = getRatesProvider();

  const baseRows = await db.selectDistinct({ base: users.defaultCurrency }).from(users);
  const bases = [...new Set(baseRows.map((r) => r.base).filter(Boolean))];
  if (bases.length === 0) bases.push('USD');

  for (const base of bases) {
    const { date, rates } = await provider.fetchRates(base, SUPPORTED_CURRENCIES);
    const values = Object.entries(rates).map(([quote, rate]) => ({ base, quote, date, rate }));
    if (values.length === 0) continue;
    await db
      .insert(fxRates)
      .values(values)
      .onConflictDoUpdate({
        target: [fxRates.base, fxRates.quote, fxRates.date],
        set: { rate: sql`excluded.rate`, updatedAt: new Date() },
      });
    console.log(`[fx] upserted ${values.length} rates for base ${base} @ ${date}`);
  }
}
```

- [ ] **Step 2: Register the worker + daily scheduler + run-once-at-boot**

In `apps/worker/src/main.ts`:
- Import: `import { createWorker, closeRedisClient, getQueue, enqueue } from '@spendlio/queue';` and `import { processFxRefresh } from './processors/fx';`.
- Add to the `workers` array: `createWorker('fx', processFxRefresh, { concurrency: 1 }),`.
- After the `console.log('worker up …')` line, add:

```ts
// FX rates: a daily repeatable (06:00 UTC) + an immediate run so rates exist now.
// First (and only) actual cron in the app — BullMQ's job scheduler manages repeats.
void (async () => {
  try {
    await getQueue('fx').upsertJobScheduler('fx-daily', { pattern: '0 6 * * *' }, { name: 'fx', data: {} });
    await enqueue('fx', {});
    console.log('[fx] scheduled daily refresh + enqueued an immediate run');
  } catch (err) {
    console.error(`[fx] scheduling failed: ${(err as Error).message}`);
  }
})();
```

- [ ] **Step 3: Integration test (gated)**

Create `apps/worker/src/processors/fx.integration.test.ts` (mirrors `@spendlio/ai`'s gated style — skips unless `DATABASE_URL`):

```ts
import { afterAll, describe, expect, it } from 'vitest';
const RUN = Boolean(process.env.DATABASE_URL);

describe.skipIf(!RUN)('fx refresh (live DB, offline provider)', () => {
  it('upserts fx_rates for the demo USD base', async () => {
    const { db, fxRates, pool } = await import('@spendlio/db');
    const { processFxRefresh } = await import('./fx');
    const { eq } = await import('drizzle-orm');
    await processFxRefresh({ data: {} } as never);
    const rows = await db.select().from(fxRates).where(eq(fxRates.base, 'USD'));
    expect(rows.some((r) => r.quote === 'EUR')).toBe(true);
    await pool.end();
  });
});
```

- [ ] **Step 4: typecheck + commit**

Run: `pnpm --filter @spendlio/worker typecheck`
(With docker up: `DATABASE_URL=postgres://spendlio:spendlio@localhost:5432/spendlio pnpm --filter @spendlio/worker test -- src/processors/fx.integration.test.ts`.)

```bash
git add apps/worker/src/processors/fx.ts apps/worker/src/main.ts apps/worker/src/processors/fx.integration.test.ts
git commit -m "feat(worker): daily fx cron — fetch per user base + upsert fx_rates"
```

---

## Task 6: `apps/api` — write the FX snapshot on transaction create

**Files:**
- Create: `apps/api/src/common/fx.ts`
- Modify: `apps/api/src/transactions/transactions.service.ts`
- Modify: `apps/api/src/receipts/receipts.service.ts`

- [ ] **Step 1: Shared API helper**

Create `apps/api/src/common/fx.ts`:

```ts
import { eq } from 'drizzle-orm';
import { users, fxRates } from '@spendlio/db';
import type { DB as Database } from '@spendlio/db';
import { computeFxSnapshot, type RateRow } from '@spendlio/core';

/**
 * Build the transaction FX snapshot columns for an insert. Reads the user's base
 * currency + the global fx_rates, then defers to core. Returns the four
 * `fxBase*` fields (or all-null when same-currency / no rate — the row is then
 * reported by recap, never summed).
 */
export async function fxSnapshotFields(
  db: Database, userId: string, amountMinor: number, currency: string,
): Promise<{ fxBaseCurrency: string | null; fxBaseAmount: number | null; fxRate: string | null; fxAsOf: string | null }> {
  const [user] = await db.select({ base: users.defaultCurrency }).from(users).where(eq(users.id, userId)).limit(1);
  const base = user?.base ?? 'USD';
  if (currency.toUpperCase() === base.toUpperCase()) {
    return { fxBaseCurrency: null, fxBaseAmount: null, fxRate: null, fxAsOf: null };
  }
  const rates: RateRow[] = await db
    .select({ base: fxRates.base, quote: fxRates.quote, date: fxRates.date, rate: fxRates.rate })
    .from(fxRates);
  const snap = computeFxSnapshot(amountMinor, currency, base, rates);
  return snap
    ? snap
    : { fxBaseCurrency: null, fxBaseAmount: null, fxRate: null, fxAsOf: null };
}
```

- [ ] **Step 2: Wire into `transactions.create`**

In `apps/api/src/transactions/transactions.service.ts`:
- Import: `import { fxSnapshotFields } from '../common/fx';`.
- Replace the `// TODO: if dto.currency !== user's base…` block + the insert with:

```ts
    const fx = await fxSnapshotFields(this.db, userId, dto.amount, dto.currency);
    const [row] = await this.db.insert(transactions)
      .values({ ...dto, ...fx, userId, occurredAt: new Date(dto.occurredAt),
        category: dto.category ?? 'transfer', status: dto.status ?? 'cleared' })
      .returning();
```

- [ ] **Step 3: Wire into `receipts.confirm`**

In `apps/api/src/receipts/receipts.service.ts`: import `fxSnapshotFields`, and before the `this.db.insert(transactions)` in `confirm()` compute the snapshot (the amount is `-Math.abs(dto.total)`, currency `dto.currency`) and spread it into the insert `.values({...})`:

```ts
    const fx = await fxSnapshotFields(this.db, userId, -Math.abs(dto.total), dto.currency);
    const [txn] = await this.db.insert(transactions).values({
      userId,
      title: dto.merchant ?? 'Receipt',
      merchant: dto.merchant ?? null,
      amount: -Math.abs(dto.total),
      currency: dto.currency,
      category: dto.category,
      occurredAt: dto.occurredAt,
      status: 'cleared',
      source: 'ocr',
      receiptId: id,
      ...fx,
    }).returning();
```

- [ ] **Step 4: typecheck + commit**

Run: `pnpm --filter @spendlio/api typecheck`
Expected: clean.

```bash
git add apps/api/src/common/fx.ts apps/api/src/transactions/transactions.service.ts apps/api/src/receipts/receipts.service.ts
git commit -m "feat(api): write the FX snapshot on transaction create (txn + receipt-confirm)"
```

---

## Task 7: `apps/worker` — FX snapshot on the recurring insert

**Files:**
- Modify: `apps/worker/src/processors/recurring.ts`

- [ ] **Step 1: Compute + store the snapshot per materialized occurrence**

In `apps/worker/src/processors/recurring.ts`:
- Add imports: `import { users, fxRates } from '@spendlio/db';` (extend the existing `@spendlio/db` import) and `import { computeFxSnapshot, type RateRow } from '@spendlio/core';`.
- Inside `processRecurring`, before the rules loop, load the rate table once: `const rates: RateRow[] = await db.select({ base: fxRates.base, quote: fxRates.quote, date: fxRates.date, rate: fxRates.rate }).from(fxRates);`
- Inside the `for (const occurredAt of due)` loop, before the insert, compute the snapshot for the rule's owner base:

```ts
      const [u] = await db.select({ base: users.defaultCurrency }).from(users).where(eq(users.id, rule.userId)).limit(1);
      const fx = computeFxSnapshot(rule.amount, rule.currency, u?.base ?? 'USD', rates)
        ?? { fxBaseCurrency: null, fxBaseAmount: null, fxRate: null, fxAsOf: null };
```

- Spread `...fx` into the `db.insert(transactions).values({ ... })`.

(Optional micro-opt: cache base per `rule.userId` in a Map across the loop — fine to skip; rule counts are small.)

- [ ] **Step 2: typecheck + commit**

Run: `pnpm --filter @spendlio/worker typecheck`

```bash
git add apps/worker/src/processors/recurring.ts
git commit -m "feat(worker): write the FX snapshot on recurring-transaction materialization"
```

---

## Task 8: `@spendlio/ai` — assistant `accountBalances` base-currency rollup

Add a base-currency grand total (with honest exclusions) to the existing per-account / per-currency output, closing the ADR-041 follow-up.

**Files:**
- Modify: `packages/ai/src/provider.ts` (extend `AccountBalanceLine` or add a return type)
- Modify: `packages/ai/src/tools/db-tools.ts` (`accountBalances` impl)
- Modify: `packages/ai/src/live/index.ts` (`accountBalances` wrapper)
- Modify: `packages/ai/src/db-tools.integration.test.ts`

- [ ] **Step 1: Convert each account to base + report excluded**

In `packages/ai/src/tools/db-tools.ts`, `accountBalances()`: after building the per-account `AccountBalanceLine[]`, also load the user's base + `fxRates`, convert each line via `convertMinor`, and return a richer result. Add `users`/`fxRates` to the schema import and `convertMinor`/`type RateRow` to the `@spendlio/core` import (already imports `netBalances as coreNetBalances`, `computeRecap`). Change the method to return:

```ts
export interface AccountBalancesResult {
  lines: AccountBalanceLine[];
  baseCurrency: string;
  baseTotalCents: number;          // sum of convertible accounts, in base
  excludedCurrencies: string[];    // currencies with no rate to base (excluded from the total)
}
```

Implementation sketch (reuses the existing `lines` build):

```ts
    const [user] = await db.select({ base: users.defaultCurrency }).from(users).where(eq(users.id, userId)).limit(1);
    const baseCurrency = user?.base ?? 'USD';
    const rates: RateRow[] = await db
      .select({ base: fxRates.base, quote: fxRates.quote, date: fxRates.date, rate: fxRates.rate }).from(fxRates);
    let baseTotalCents = 0;
    const excluded = new Set<string>();
    for (const l of lines) {
      const { amount } = convertMinor(l.balanceCents, l.currency, baseCurrency, rates);
      if (amount === null) excluded.add(l.currency);
      else baseTotalCents += amount;
    }
    return { lines, baseCurrency, baseTotalCents, excludedCurrencies: [...excluded] };
```

Update the `AssistantTools.accountBalances` signature to `Promise<AccountBalancesResult>`.

- [ ] **Step 2: Update the AI-SDK wrapper**

In `packages/ai/src/live/index.ts`, the `accountBalances` `execute`:

```ts
      execute: async () => {
        const r = await t.accountBalances();
        return {
          accounts: r.lines.map((l) => ({ account: l.accountName, balance: money(l.balanceCents, l.currency) })),
          byCurrency: subtotalByCurrency(r.lines).map((s) => ({ currency: s.currency, total: money(s.totalCents, s.currency) })),
          baseTotal: money(r.baseTotalCents, r.baseCurrency),
          baseTotalNote: r.excludedCurrencies.length
            ? `approx — excludes ${r.excludedCurrencies.join(', ')} (no rate)`
            : 'approx, at latest rates',
        };
      },
```

Update the tool description to mention it now also returns an approximate base-currency total.

- [ ] **Step 3: Update the offline stub + any callers**

- `packages/ai/src/ai.test.ts`: change the `stubTools.accountBalances` to `async accountBalances() { return { lines: [], baseCurrency: 'USD', baseTotalCents: 0, excludedCurrencies: [] }; }`.
- Search for other `accountBalances(` callers (offline provider has none; only the wrapper) and update.

- [ ] **Step 4: Integration assertion**

In `packages/ai/src/db-tools.integration.test.ts`, extend the `accountBalances` case: with the seeded multi-currency accounts (Task 10) + fx_rates, assert `result.baseCurrency === 'USD'`, `result.baseTotalCents` > 0, and `result.excludedCurrencies` is empty when all rates exist.

- [ ] **Step 5: Verify + commit**

Run: `pnpm --filter @spendlio/ai typecheck && pnpm --filter @spendlio/ai test`
Expected: clean + green.

```bash
git add packages/ai/src
git commit -m "feat(assistant): accountBalances base-currency rollup (closes ADR-041 follow-up)"
```

---

## Task 9: `apps/web` — accounts "All" no-rate UX

Today the "All" tab sums `baseBalance ?? 0`, silently dropping no-rate accounts and **understating** the total. Convert what we can and surface how many were excluded.

**Files:**
- Modify: `apps/web/features/accounts/components/accounts-tabs.tsx`

- [ ] **Step 1: Count + surface the excluded accounts**

Read the file. Where the "All" total is computed (`sum of baseBalance ?? 0`), also compute `const notConverted = balances.filter((b) => b.baseBalance === null && b.balance !== 0).length;`. In the "All" tab's caption next to "approx · as of {rateAsOf}", append, when `notConverted > 0`: `· ${notConverted} account${notConverted > 1 ? 's' : ''} not converted (no rate)`. Keep the existing token-driven inline styles; this is a text/label addition only.

- [ ] **Step 2: Verify + commit**

Run: `pnpm --filter web typecheck && pnpm --filter web build`
Expected: clean build.

```bash
git add apps/web/features/accounts/components/accounts-tabs.tsx
git commit -m "fix(web): accounts 'All' surfaces un-converted accounts instead of silently dropping them"
```

---

## Task 10: `@spendlio/db` — seed multi-currency demo + fx_rates

**Files:**
- Modify: `packages/db/src/seed.ts`

- [ ] **Step 1: Add non-USD accounts, a few transactions, and fx_rates**

Read the seed's existing account/transaction insert blocks + its fixed-UUID convention. Add (idempotent, `onConflictDoNothing`, fixed UUIDs):
- An **EUR** account and an **ARS** account for the demo user.
- ~2 transactions in each (negative = expense), occurring in the current demo month, with `accountId` set; leave `fxBase*` null in the seed (the API/cron fills snapshots for *new* txns; for seeded ones the converted views use latest `fx_rates`).
- `fx_rates` rows so conversions resolve immediately without running the cron — matching the offline table (Task 4) for `2026-06-18`:

```ts
await db.insert(fxRates).values([
  { base: 'USD', quote: 'EUR', date: '2026-06-18', rate: '0.92' },
  { base: 'USD', quote: 'ARS', date: '2026-06-18', rate: '950' },
]).onConflictDoNothing();
```

(Import `fxRates` in the seed if not already.)

- [ ] **Step 2: Run the seed + verify**

Run (docker up): `pnpm db:seed` then sanity-check: `GET /accounts/balances` for the demo user shows a non-null `baseBalance` for the EUR/ARS accounts and the web "All" tab shows a converted grand total.

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/seed.ts
git commit -m "chore(db): seed EUR/ARS demo accounts + fx_rates so converted totals are visible"
```

---

## Task 11: ADRs, PROGRESS, and verification

**Files:**
- Modify: `docs/learning/decisions.md`
- Modify: `docs/learning/12-currency-and-fx.md` (resolve the "open decision" line)
- Modify: `PROGRESS.md`

- [ ] **Step 1: Resolve ADR-016 + add the posture ADR**

In `docs/learning/decisions.md`: change ADR-016's status to `✅` and update its `**Open:**` line to **resolved** — provider = Frankfurter (ECB) behind a `RatesProvider` interface, **daily** cadence, **half-up to target minor units** rounding. Append a new **ADR-042** (`### ADR-042 · ✅ · FX rates ingestion + snapshot-on-create`) capturing: interface + offline-default + live-adapter (parallel to `@spendlio/ai`); lives in `apps/worker`; **per-base** fetch (no triangulation); snapshot written on every create path; **base-aware `computeRecap`** (no recompute job); **first real BullMQ scheduler** (`upsertJobScheduler`, daily + boot run); deferred follow-ups (recap "N excluded" badge — needs a column/migration; Insights/Overview conversion; per-account budgets).

- [ ] **Step 2: Update the currency learning doc**

In `docs/learning/12-currency-and-fx.md`, change the closing "Open decision: rates provider…" line to record the resolution (Frankfurter via interface, daily, half-up), pointing to ADR-042.

- [ ] **Step 3: Update PROGRESS.md**

Tick the FX follow-up in the Follow-ups list; add a build-log row (newest first) summarizing the feature, the resolution of ADR-016, and the deferred recap badge.

- [ ] **Step 4: Full verification**

Run:
```bash
pnpm -r typecheck
pnpm --filter @spendlio/core test && pnpm --filter @spendlio/contracts test && pnpm --filter @spendlio/ai test && pnpm --filter @spendlio/worker test
pnpm --filter web build
```
With docker up: `pnpm db:seed` then the gated integration suites (`DATABASE_URL=… pnpm --filter @spendlio/ai test -- src/db-tools.integration.test.ts` and the worker fx integration test).

- [ ] **Step 5: Live gate (manual, like ADR-041)** — with `FX_PROVIDER=frankfurter` + network, run the worker and confirm the boot `fx` job fetches real ECB rates and upserts `fx_rates` (check the `[fx] upserted …` log + the rows). Record as a manual gate; offline + DB paths are proven automatically.

- [ ] **Step 6: Commit**

```bash
git add docs/learning/decisions.md docs/learning/12-currency-and-fx.md PROGRESS.md
git commit -m "docs(fx): resolve ADR-016 + ADR-042 (rates ingestion, snapshot, base-aware recap)"
```

---

## Self-review (against the spec)

- **Spec coverage:** §3 architecture → Tasks 1/4/6 (core math; provider in worker; api reads fx_rates). §4 ingestion → Tasks 3 (job), 4 (provider), 5 (cron + scheduler), 10 (seed). §5 snapshot-on-create → Tasks 6 (txn + receipt) + 7 (recurring). §6 conversion model → Task 2 (base-aware recap) + existing latest-rate balances. §7 consumers → Task 9 (accounts All), Task 2/recap totals, Task 8 (assistant). §8 seed → Task 10. §9 rounding → ratified (convertMinor; noted). §12 ADRs → Task 11.
- **Known spec deviation (recorded):** the recap **"N excluded" UI badge** is deferred (persisting `skipped` needs a migration the spec forbids); snapshot-based recap totals + a worker log ship instead. Captured in Task 11's ADR + PROGRESS.
- **Placeholder scan:** code shown for every code step; the lighter "read the file then add" steps (9, 10, parts of 8) are additive label/seed edits a subagent applies against the real file — no logic left unspecified.
- **Type consistency:** `FxSnapshot`/`fxBase*` field names match across core (Task 1), the api helper (Task 6), recurring (Task 7), and the DB columns. `RecapTxn.fxBaseCurrency` (Task 2) matches the recap worker select. `AccountBalancesResult` (Task 8) is defined once and used by the wrapper + stub + integration test. `FxRefreshJob`/`QUEUES.fx` consistent across contracts + queue (Task 3) + worker (Task 5).
- **Caveat:** `apps/worker` gains a Vitest runner (Task 4) for the pure offline provider; DB-touching worker code stays integration-gated, consistent with the repo's test policy.
