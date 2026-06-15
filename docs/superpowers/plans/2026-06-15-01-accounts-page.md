# Accounts Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `/accounts` page (multi-currency "bank tabs") backed by a new `GET /accounts/balances` endpoint that returns, per account, the net of its non-deleted transactions in the account's own currency plus that value converted to the user's base/default currency via the latest `fx_rates` (converted value is `null` — shown as "—" — when no rate exists for the pair).

**Architecture:** Dependencies point inward toward `contracts`. The conversion + summation math is pure functions in `packages/core` (no framework, no DB, no React), unit-tested with Vitest. A thin NestJS service + controller in `apps/api/src/accounts` mirrors the existing accounts trio, guarded by `AuthGuard`, reads via Drizzle, and **filters every query by `user_id`**. A new Zod contract `AccountBalanceSchema` in `packages/contracts` is the single source of truth shared by API and web. The web app adds `getAccountBalances()` to `apps/web/lib/resources.ts` (parsed against the contract) and a server-component page `app/accounts/page.tsx` that reads it via `safe()`, with a small client component owning the currency-tab state (because `SegmentedControl` needs `onChange`). Money stays integer minor units everywhere; formatting happens only at the UI edge via `MoneyAmount`.

**Tech Stack:** TypeScript (strict), Zod (contracts), NestJS + Drizzle ORM (api), PostgreSQL, Vitest (core/contracts tests), Next.js App Router server components + `@spendlio/ui` (web), lucide-react icons.

---

## Context the worker must know

- **Money is integer minor units (cents).** `amount` on `transactions` is `bigint(mode:'number')` in minor units of the row's `currency`. Never use floats for storage/compute; format only at the UI edge.
- **FX rates** live in the global (not user-owned) `fxRates` table: columns `base`, `quote`, `date` (YYYY-MM-DD), `rate` (exact decimal **string**, meaning `1 base → rate quote`). There is currently **no FX conversion code anywhere in `apps/api`/`apps/worker`** — the `transactions.fxBase*` columns exist but are unused. This plan writes the conversion math fresh in `packages/core`.
- **Conversion direction:** an account holds money in `account.currency`; we convert to the user's `defaultCurrency` (the base view). The stored rate is keyed `base → quote`. We look up the rate row whose pair connects `account.currency` and the user's base in either orientation, take the **latest by `date`**, and apply it (multiply or divide accordingly). If `account.currency === base`, the converted amount equals the native amount (rate 1, no lookup). If no rate row connects the pair, the converted amount is `null`.
- **Rounding rule:** convert by working in minor units, applying the decimal-string rate at full precision, then rounding to the **base** currency's minor units with `Math.round`. Use `getCurrencyDecimals` from `@spendlio/contracts` for both currencies' exponents (decimals differ: JPY=0, BHD=3).
- **Existing accounts pattern:** `apps/api/src/accounts/{accounts.controller,accounts.service,accounts.module}.ts`. The service injects `@Inject(DB) private db: any`. Note `AccountsService.list()` returns `{ items, nextCursor: null }` but the web `listAccounts()` parses `z.array(AccountSchema)` — **pre-existing mismatch; out of scope, do not touch it.** The new balances endpoint returns a plain array (matching what the new resource parses).
- **Auth plumbing:** controllers use `@UseGuards(AuthGuard)` + `@CurrentUser() u: { id: string }`. The guard reads `x-user-id` (dev). The web client (`apps/web/lib/api.ts`) sends that header server-side.
- **`SegmentedControl`** (`@spendlio/ui`) is a client component (`onChange`). A server component cannot pass it a handler, so the page renders a `'use client'` `AccountsTabs` child that owns the selected-tab state and the per-currency filtering/rendering.
- **Run commands** with filters: `pnpm --filter @spendlio/contracts ...`, `pnpm --filter @spendlio/core ...`, `pnpm --filter @spendlio/api ...` (check the api package name — the dir is `apps/api`; use the workspace name from its `package.json`, e.g. `@spendlio/api`), `pnpm --filter web ...`.
- **Commit style:** conventional commits, end the message body with the `Co-Authored-By` trailer per repo convention.

---

## Task 1: Add the `AccountBalance` contract

**Files:**
- Modify: `packages/contracts/src/account.ts` (append schema)
- Create: `packages/contracts/src/account.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/contracts/src/account.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { AccountBalanceSchema } from './account';

describe('AccountBalanceSchema', () => {
  it('parses an account balance with a converted base value', () => {
    const parsed = AccountBalanceSchema.parse({
      accountId: '11111111-1111-1111-1111-111111111111',
      name: 'Galicia Pesos',
      type: 'checking',
      last4: '4821',
      currency: 'ARS',
      balance: -1234500,
      baseCurrency: 'USD',
      baseBalance: -1290,
      rateAsOf: '2026-06-14',
    });
    expect(parsed.balance).toBe(-1234500);
    expect(parsed.baseBalance).toBe(-1290);
  });

  it('allows a null converted balance when no FX rate exists', () => {
    const parsed = AccountBalanceSchema.parse({
      accountId: '22222222-2222-2222-2222-222222222222',
      name: 'Cash',
      type: 'cash',
      last4: null,
      currency: 'BRL',
      balance: 5000,
      baseCurrency: 'USD',
      baseBalance: null,
      rateAsOf: null,
    });
    expect(parsed.baseBalance).toBeNull();
    expect(parsed.rateAsOf).toBeNull();
  });

  it('rejects a non-integer balance (money must be minor units)', () => {
    expect(() =>
      AccountBalanceSchema.parse({
        accountId: '33333333-3333-3333-3333-333333333333',
        name: 'X', type: 'card', last4: null, currency: 'USD',
        balance: 12.5, baseCurrency: 'USD', baseBalance: 12, rateAsOf: null,
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL**

Run: `pnpm --filter @spendlio/contracts test -- src/account.test.ts`
Expected: FAIL — `AccountBalanceSchema` is not exported from `./account`.

- [ ] **Step 3: Implement the schema** — append to `packages/contracts/src/account.ts` (after the `UpdateAccountInput` block):

```ts
// Per-account balance rollup for the Accounts page. `balance` is the net of the
// account's non-deleted transactions in the account's OWN currency (minor units).
// `baseBalance` is that value converted to the user's base/default currency via
// the latest fx_rates — and is null (UI shows "—") when no rate connects the pair.
export const AccountBalanceSchema = z.object({
  accountId: z.string().uuid(),
  name: z.string().min(1),
  type: AccountType,
  last4: z.string().length(4).nullable(),
  currency: CurrencyCode,
  balance: z.number().int(),            // minor units in `currency`
  baseCurrency: CurrencyCode,
  baseBalance: z.number().int().nullable(),  // minor units in baseCurrency; null = rate unavailable
  rateAsOf: z.string().nullable(),      // YYYY-MM-DD of the rate used; null when native or unavailable
});
export type AccountBalance = z.infer<typeof AccountBalanceSchema>;
```

- [ ] **Step 4: Run the test — expect PASS**

Run: `pnpm --filter @spendlio/contracts test -- src/account.test.ts && pnpm --filter @spendlio/contracts typecheck`
Expected: PASS, typecheck exits 0. (`AccountBalanceSchema` is re-exported by the existing `export * from './account'` in `src/index.ts`.)

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/account.ts packages/contracts/src/account.test.ts
git commit -m "feat(contracts): add AccountBalance schema for accounts rollup

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Pure balance + FX conversion math in `packages/core`

**Files:**
- Create: `packages/core/src/accounts.ts`
- Create: `packages/core/src/accounts.test.ts`
- Modify: `packages/core/src/index.ts` (add `export * from './accounts';`)

- [ ] **Step 1: Write the failing test**

`packages/core/src/accounts.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { sumNet, convertMinor, pickRate, type RateRow } from './accounts';

describe('sumNet', () => {
  it('nets signed minor-unit amounts', () => {
    expect(sumNet([1000, -250, -100])).toBe(650);
  });
  it('returns 0 for no transactions', () => {
    expect(sumNet([])).toBe(0);
  });
});

describe('pickRate', () => {
  const rows: RateRow[] = [
    { base: 'USD', quote: 'ARS', date: '2026-06-10', rate: '1000' },
    { base: 'USD', quote: 'ARS', date: '2026-06-14', rate: '1100' },
    { base: 'USD', quote: 'BRL', date: '2026-06-14', rate: '5.4' },
  ];

  it('picks the latest row for a direct pair (from -> to)', () => {
    const r = pickRate(rows, 'ARS', 'USD'); // account ARS -> base USD
    // direct row is USD->ARS; ARS->USD is the inverse, latest date wins
    expect(r).toEqual({ rate: '1100', date: '2026-06-14', invert: true });
  });

  it('picks a forward-oriented row when from is the stored base', () => {
    const r = pickRate(rows, 'USD', 'ARS'); // USD -> ARS forward
    expect(r).toEqual({ rate: '1100', date: '2026-06-14', invert: false });
  });

  it('returns null when no row connects the pair', () => {
    expect(pickRate(rows, 'ARS', 'EUR')).toBeNull();
  });
});

describe('convertMinor', () => {
  it('returns the same amount with rate 1 when currencies match', () => {
    const out = convertMinor(-1290, 'USD', 'USD', []);
    expect(out).toEqual({ amount: -1290, rateAsOf: null });
  });

  it('converts ARS minor units to USD minor units using the inverse of USD->ARS', () => {
    // 1 USD = 1100 ARS. -1,234,500 ARS cents = -12,345.00 ARS = -11.222... USD
    // -12345 ARS major / 1100 = -11.2227 USD major -> -1122 USD cents (rounded)
    const rows: RateRow[] = [{ base: 'USD', quote: 'ARS', date: '2026-06-14', rate: '1100' }];
    const out = convertMinor(-1234500, 'ARS', 'USD', rows);
    expect(out.amount).toBe(-1122);
    expect(out.rateAsOf).toBe('2026-06-14');
  });

  it('converts using a forward USD->BRL rate', () => {
    // 1 USD = 5.4 BRL. 10000 USD cents = 100.00 USD = 540.00 BRL = 54000 BRL cents
    const rows: RateRow[] = [{ base: 'USD', quote: 'BRL', date: '2026-06-14', rate: '5.4' }];
    const out = convertMinor(10000, 'USD', 'BRL', rows);
    expect(out.amount).toBe(54000);
  });

  it('returns null when no rate connects the pair', () => {
    const out = convertMinor(5000, 'BRL', 'USD', []);
    expect(out).toEqual({ amount: null, rateAsOf: null });
  });

  it('respects differing currency decimals (JPY has 0)', () => {
    // 1 USD = 150 JPY. 1000 USD cents = 10.00 USD = 1500 JPY = 1500 JPY minor (0 decimals)
    const rows: RateRow[] = [{ base: 'USD', quote: 'JPY', date: '2026-06-14', rate: '150' }];
    const out = convertMinor(1000, 'USD', 'JPY', rows);
    expect(out.amount).toBe(1500);
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL**

Run: `pnpm --filter @spendlio/core test -- src/accounts.test.ts`
Expected: FAIL — cannot resolve `./accounts`.

- [ ] **Step 3: Implement the math** — `packages/core/src/accounts.ts`:

```ts
import { getCurrencyDecimals } from '@spendlio/contracts';

/** Net of signed minor-unit amounts (all in the same currency). */
export function sumNet(amountsMinor: number[]): number {
  return amountsMinor.reduce((t, x) => t + x, 0);
}

/** A row from the global fx_rates table: 1 `base` = `rate` `quote` on `date`. */
export interface RateRow {
  base: string;
  quote: string;
  date: string; // YYYY-MM-DD
  rate: string; // exact decimal string
}

/** A resolved rate to apply when converting `from` -> `to`. */
export interface PickedRate {
  rate: string;
  date: string;
  /** When true, divide by the rate (the stored row is `to`->`from`). */
  invert: boolean;
}

/**
 * Find the latest-dated fx_rates row connecting `from` and `to`, in either
 * orientation. A forward row (base=from, quote=to) is applied as-is; a reverse
 * row (base=to, quote=from) is applied inverted. Latest `date` wins. Null when
 * no row connects the pair.
 */
export function pickRate(rows: RateRow[], from: string, to: string): PickedRate | null {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  let best: PickedRate | null = null;
  for (const row of rows) {
    const b = row.base.toUpperCase();
    const q = row.quote.toUpperCase();
    let invert: boolean | null = null;
    if (b === f && q === t) invert = false;
    else if (b === t && q === f) invert = true;
    if (invert === null) continue;
    if (!best || row.date > best.date) best = { rate: row.rate, date: row.date, invert };
  }
  return best;
}

/**
 * Convert `amountMinor` (minor units of `from`) into minor units of `to` using
 * the latest connecting rate in `rows`. Same currency returns the input
 * unchanged (rateAsOf null). No connecting rate returns { amount: null }.
 * Works at full float precision on the rate, rounding to `to`'s minor units.
 */
export function convertMinor(
  amountMinor: number,
  from: string,
  to: string,
  rows: RateRow[],
): { amount: number | null; rateAsOf: string | null } {
  if (from.toUpperCase() === to.toUpperCase()) return { amount: amountMinor, rateAsOf: null };

  const picked = pickRate(rows, from, to);
  if (!picked) return { amount: null, rateAsOf: null };

  const rate = Number(picked.rate);
  const factor = picked.invert ? 1 / rate : rate;

  const fromMajor = amountMinor / 10 ** getCurrencyDecimals(from);
  const toMajor = fromMajor * factor;
  const toMinor = Math.round(toMajor * 10 ** getCurrencyDecimals(to));
  return { amount: toMinor, rateAsOf: picked.date };
}
```

- [ ] **Step 4: Wire the barrel** — append to `packages/core/src/index.ts`:

```ts
export * from './accounts';
```

- [ ] **Step 5: Run the test — expect PASS**

Run: `pnpm --filter @spendlio/core test -- src/accounts.test.ts && pnpm --filter @spendlio/core typecheck`
Expected: PASS, typecheck exits 0.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/accounts.ts packages/core/src/accounts.test.ts packages/core/src/index.ts
git commit -m "feat(core): account balance summation + fx conversion (minor units)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: `GET /accounts/balances` endpoint (service + controller)

The endpoint composes: (1) the user's accounts, (2) the net of each account's non-deleted transactions in the account's currency, (3) the user's `defaultCurrency` (base), (4) the relevant `fxRates` rows, then maps each account to an `AccountBalance` using the core math. **Every DB read is filtered by `user_id`** (accounts and transactions); `fxRates` is global (no `user_id` column).

**Files:**
- Modify: `apps/api/src/accounts/accounts.service.ts` (add `balances(userId)`)
- Modify: `apps/api/src/accounts/accounts.controller.ts` (add `GET balances` route)

- [ ] **Step 1: Add the service method** — in `apps/api/src/accounts/accounts.service.ts`.

Update the imports at the top:
```ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { accounts, transactions, users, fxRates } from '@spendlio/db';
import { sumNet, convertMinor, type RateRow } from '@spendlio/core';
import type { CreateAccountInput, UpdateAccountInput, AccountBalance } from '@spendlio/contracts';
import { DB } from '../db/db.module';
```

Add this method to the `AccountsService` class (after `list`, before `create`):
```ts
  /**
   * Per-account balance rollup for the Accounts page. For each of the user's
   * accounts: net its non-deleted transactions (in the account's own currency)
   * and convert that to the user's base/default currency via the latest
   * fx_rates. Strictly scoped to userId; fx_rates is global. Converted value is
   * null when no rate connects the pair (the UI renders "—").
   */
  async balances(userId: string): Promise<AccountBalance[]> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    const baseCurrency: string = user?.defaultCurrency ?? 'USD';

    const accountRows = await this.db.select().from(accounts)
      .where(eq(accounts.userId, userId))
      .orderBy(desc(accounts.createdAt));

    // Non-deleted transactions for THIS user, with their account + currency + amount.
    const txnRows = await this.db
      .select({
        accountId: transactions.accountId,
        amount: transactions.amount,
        currency: transactions.currency,
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)));

    // Global fx_rates (no user scope). Loaded once and handed to core for picking.
    const rateRows: RateRow[] = await this.db
      .select({ base: fxRates.base, quote: fxRates.quote, date: fxRates.date, rate: fxRates.rate })
      .from(fxRates);

    // Net per account, in the account's own currency (transactions carry their
    // own currency, but an account holds a single currency, so we only sum the
    // amounts that belong to that account).
    const netByAccount = new Map<string, number[]>();
    for (const t of txnRows) {
      if (!t.accountId) continue;
      const arr = netByAccount.get(t.accountId) ?? [];
      arr.push(t.amount);
      netByAccount.set(t.accountId, arr);
    }

    return accountRows.map((a: any): AccountBalance => {
      const balance = sumNet(netByAccount.get(a.id) ?? []);
      const converted = convertMinor(balance, a.currency, baseCurrency, rateRows);
      return {
        accountId: a.id,
        name: a.name,
        type: a.type,
        last4: a.last4 ?? null,
        currency: a.currency,
        balance,
        baseCurrency,
        baseBalance: converted.amount,
        rateAsOf: converted.rateAsOf,
      };
    });
  }
```

> Note: amounts on `transactions` are stored in the row's own `currency`. We assume an account's transactions are denominated in that account's currency (the account holds one currency — see `accounts.currency`). Summing the raw `amount`s yields the net in the account's currency. (If a stray transaction had a different currency, this slice does not attempt to re-convert it — that is out of scope and not part of the seed/data model expectations.)

- [ ] **Step 2: Add the controller route** — in `apps/api/src/accounts/accounts.controller.ts`, add **above** the `@Get(':id')` route (so `balances` is matched before the `:id` param route):

```ts
  @Get('balances')
  balances(@CurrentUser() u: { id: string }) { return this.svc.balances(u.id); }
```

The final controller order is: `@Get()` list → `@Post()` create → `@Get('balances')` → `@Get(':id')` get → `@Patch(':id')` → `@Delete(':id')`. **Order matters:** a literal `balances` route declared before `:id` prevents `:id` from swallowing `/accounts/balances`.

- [ ] **Step 3: Typecheck the API**

Run: `pnpm --filter @spendlio/api typecheck` (use the api package's actual workspace name from `apps/api/package.json`).
Expected: 0 errors. Confirms `@spendlio/db` exports `transactions`, `users`, `fxRates` and `@spendlio/core` exports `sumNet`/`convertMinor`/`RateRow`.

- [ ] **Step 4: Manual smoke (optional, if the stack is up)**

With `pnpm dev` / mprocs running and the DB seeded:
```bash
curl -s -H 'x-user-id: 00000000-0000-0000-0000-000000000001' http://localhost:4000/api/accounts/balances | head
```
Expected: a JSON array of objects with `accountId`, `balance` (integer cents), `baseCurrency`, `baseBalance` (integer or null), `rateAsOf`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/accounts/accounts.service.ts apps/api/src/accounts/accounts.controller.ts
git commit -m "feat(api): GET /accounts/balances rollup with fx-converted base value

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Web data layer — `getAccountBalances()`

**Files:**
- Modify: `apps/web/lib/resources.ts`

- [ ] **Step 1: Add the import** — extend the `@spendlio/contracts` import block in `apps/web/lib/resources.ts` with:

```ts
  AccountBalanceSchema,
  type AccountBalance,
```
(Add these two lines inside the existing import alongside `AccountSchema, type Account`.)

- [ ] **Step 2: Add the resource function** — in the `// ---- Accounts ----` section, after `listAccounts()`:

```ts
export function getAccountBalances(): Promise<AccountBalance[]> {
  return api.get(`/accounts/balances`, z.array(AccountBalanceSchema));
}
```

- [ ] **Step 3: Re-export the type** — add `AccountBalance` to the bottom `export type { ... }` block (next to `Account`):

```ts
  AccountBalance,
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: 0 errors. (Parsing against `z.array(AccountBalanceSchema)` means any API/contract drift surfaces here as a parse error at runtime, not a silent bug — matching the existing reads.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/resources.ts
git commit -m "feat(web): getAccountBalances() resource parsed against contract

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Accounts page + currency tabs

The page is a server component (`safe()` read). The currency tabs need client state (`SegmentedControl.onChange`), so the rendering of tabs + filtered cards lives in a `'use client'` child that receives the already-fetched `AccountBalance[]`.

**Files:**
- Create: `apps/web/app/accounts/AccountsTabs.tsx` (client component)
- Create: `apps/web/app/accounts/page.tsx` (server component)

- [ ] **Step 1: Create the client tabs component** — `apps/web/app/accounts/AccountsTabs.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { Card, SegmentedControl, MoneyAmount, EmptyState } from '@spendlio/ui';
import { Landmark } from 'lucide-react';
import type { AccountBalance } from '../../lib/resources';

export function AccountsTabs({ balances }: { balances: AccountBalance[] }) {
  // Distinct account currencies, in first-seen order, plus an "All" rollup tab.
  const currencies = useMemo(() => {
    const seen: string[] = [];
    for (const b of balances) if (!seen.includes(b.currency)) seen.push(b.currency);
    return seen;
  }, [balances]);

  const baseCurrency = balances[0]?.baseCurrency ?? 'USD';

  const options = useMemo(
    () => [{ value: 'all', label: 'All' }, ...currencies.map((c) => ({ value: c, label: c }))],
    [currencies],
  );

  const [tab, setTab] = useState<string>('all');

  if (balances.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Landmark />}
          title="No accounts yet"
          message="Add a bank, card, or cash account to start tracking balances across currencies."
        />
      </Card>
    );
  }

  const isAll = tab === 'all';
  const visible = isAll ? balances : balances.filter((b) => b.currency === tab);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <SegmentedControl
        options={options}
        value={tab}
        onChange={setTab}
        ariaLabel="Filter accounts by currency"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {visible.map((b) => {
          // In an "All" view we show the base-converted rollup value (approximate);
          // in a per-currency tab we show the native balance.
          const showBase = isAll;
          const amount = showBase ? b.baseBalance : b.balance;
          const currency = showBase ? b.baseCurrency : b.currency;

          return (
            <Card key={b.accountId}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-4)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-ink)' }}>
                    {b.name}
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-ink-muted)',
                      display: 'flex',
                      gap: 'var(--space-2)',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ textTransform: 'capitalize' }}>{b.type}</span>
                    {b.last4 ? (
                      <span style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
                        ···· {b.last4}
                      </span>
                    ) : null}
                  </span>
                </div>

                {amount === null ? (
                  <span
                    title="Conversion rate unavailable"
                    style={{ color: 'var(--color-ink-subtle)', fontFamily: 'var(--font-display)' }}
                  >
                    —
                  </span>
                ) : (
                  <MoneyAmount amount={amount} currency={currency} size="lg" color="auto" />
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {isAll ? (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)' }}>
          Converted to {baseCurrency} using the latest available rates — values are approximate.
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Create the server page** — `apps/web/app/accounts/page.tsx`:

```tsx
import { getAccountBalances, type AccountBalance } from '../../lib/resources';
import { safe } from '../../lib/safe';
import { PageHeader } from '../_components/PageHeader';
import { Notice } from '../_components/Notice';
import { AccountsTabs } from './AccountsTabs';

export default async function AccountsPage() {
  const { data, error } = await safe<AccountBalance[]>(() => getAccountBalances(), []);

  return (
    <div>
      <PageHeader eyebrow="Money" title="Accounts" />

      {error ? (
        <Notice tone="warn">
          The API is not reachable yet, so balances are empty. Start the API (apps/api) and seed the
          database to see live account balances.
        </Notice>
      ) : null}

      <AccountsTabs balances={data} />
    </div>
  );
}
```

> Confirm `apps/web/app/_components/Notice.tsx` exists (it is used by `transactions/page.tsx`) and accepts `tone="warn"` + children. If its prop name differs, match it.

- [ ] **Step 3: Typecheck the web app**

Run: `pnpm --filter web typecheck`
Expected: 0 errors. (`EmptyState` is exported by `@spendlio/ui` per the foundation plan; `Landmark` is a valid lucide-react icon.)

- [ ] **Step 4: Manual smoke (if stack is up)**

Visit `http://localhost:3000/accounts` with the API running + seeded. Expect: currency tabs (All + each account currency); each account a card showing name, capitalized type, mono `···· last4`, and a balance via `MoneyAmount`; the "All" tab shows base-converted values with the approximate-rate note; accounts whose base value is unavailable show "—"; an `EmptyState` when there are no accounts.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/accounts/page.tsx apps/web/app/accounts/AccountsTabs.tsx
git commit -m "feat(web): accounts page with multi-currency tabs + base rollup

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Add the Accounts nav link

**Files:**
- Modify: `apps/web/app/_components/AppShell.tsx`

- [ ] **Step 1: Import the icon** — `Wallet` is already used by Budgets, so use `Landmark` (bank). Extend the lucide import:

```tsx
import {
  LayoutDashboard,
  ArrowLeftRight,
  Landmark,
  Wallet,
  Users,
  Sparkles,
  Settings,
} from 'lucide-react';
```

- [ ] **Step 2: Add the nav entry** — insert into the `NAV` array, after Transactions and before Budgets:

```tsx
  { href: '/accounts', label: 'Accounts', icon: Landmark },
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: 0 errors. The existing `isActive` (prefix match) + `Icon size={18}` rendering handles the new entry with no other changes.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/_components/AppShell.tsx
git commit -m "feat(web): add Accounts nav link

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Verification + PROGRESS

- [ ] **Step 1: Run all touched-package checks**

```bash
pnpm --filter @spendlio/contracts test
pnpm --filter @spendlio/core test
pnpm --filter @spendlio/contracts typecheck
pnpm --filter @spendlio/core typecheck
pnpm --filter @spendlio/api typecheck
pnpm --filter web typecheck
```
Expected: all tests PASS; all typechecks exit 0.

- [ ] **Step 2: Confirm `user_id` scoping** — re-read `apps/api/src/accounts/accounts.service.ts` `balances()`: the `accounts` and `transactions` selects both filter by `eq(*.userId, userId)`; `fxRates` is the only unscoped read and it is a global table with no `user_id` column. Confirm no other table is read unscoped.

- [ ] **Step 3: Update `PROGRESS.md`** — tick the Accounts-page / `GET /accounts/balances` row, set the status line + date (2026-06-15), and add a Build-Log entry per CLAUDE.md "How to work".

- [ ] **Step 4: Commit**

```bash
git add PROGRESS.md
git commit -m "chore: tick accounts page + balances endpoint in PROGRESS

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-review notes

- **Golden rules honored:** `contracts` (`AccountBalanceSchema`) and `core` (`accounts.ts`) import no framework / no DB / no React — `core` only imports `getCurrencyDecimals` from `@spendlio/contracts`. Money stays integer minor units end to end; formatting happens only in `MoneyAmount` at the UI edge. Every API input/output crosses a Zod boundary (response parsed in `resources.ts`). Both user-owned reads (`accounts`, `transactions`) filter by `user_id`; `fx_rates` is global by design.
- **Reuse vs. new math:** `packages/core/src/balances.ts` (`netForUser`) is for the *split/settlement* who-owes-whom graph — **not** reusable for account balances. The account rollup is a plain signed sum plus FX conversion, so this plan adds a small new `accounts.ts` rather than overloading `balances.ts`. `money.ts`/`getCurrencyDecimals` is reused for decimals.
- **FX semantics:** rate is `1 base → rate quote` (decimal string). `pickRate` finds the latest-dated row in either orientation and flags inversion; missing pair → `baseBalance: null` → UI "—", never a guess. This matches the spec's "Risks" note (FX rates may be absent).
- **Route ordering:** `GET /accounts/balances` is declared before `GET /accounts/:id` so the literal path is not captured by the `:id` param.
- **Ambiguities / gaps noticed (flag to lead):**
  1. **Transaction currency vs. account currency.** The data model gives each *account* one currency but stores a `currency` on each *transaction*. This plan assumes an account's transactions are denominated in the account's currency and sums raw amounts; it does not re-convert per-transaction currencies into the account currency. If seeded data violates that, the native balance could mix currencies. Worth confirming with the seed.
  2. **Transactions with no `accountId`.** `transactions.accountId` is nullable; such rows are excluded from all account rollups (they belong to no account). That seems correct but is a product decision — flagged.
  3. **Pre-existing shape mismatch:** `AccountsService.list()` returns `{ items, nextCursor }` while web `listAccounts()` parses `z.array(AccountSchema)`. Out of scope for this slice; not touched. The new `balances()` deliberately returns a plain array to match its resource parser.
  4. **`fxRates.date` is a YYYY-MM-DD string;** "latest" is computed by lexicographic string comparison, which is correct for zero-padded ISO dates. No `Date` parsing needed.
  5. **`Notice` component prop shape** is assumed from `transactions/page.tsx` usage (`tone="warn"` + children); verify before relying on it.
