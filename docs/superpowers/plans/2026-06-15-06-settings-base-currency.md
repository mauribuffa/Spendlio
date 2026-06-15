# Settings & Base Currency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the demo user's `name` and `defaultCurrency` editable end-to-end (Slice F of the UI/pages design spec). Add a `PATCH /me` endpoint that updates only those two fields for the current user, wire a `updateMe()` web resource, and turn the read-only `/settings` page into an editable form (name + a currency `Select`) that submits via a server action and revalidates. Auth stays parked — the demo `x-user-id` header continues to identify the user.

**Architecture:** Dependencies point inward toward `contracts`. The write DTO is a Zod schema in `@spendlio/contracts`; the API validates it with the existing `ZodPipe` and scopes the update by `@CurrentUser().id` (never trusting a client-supplied id); `MeController` talks to the Drizzle `db` client directly (there is **no** `MeService` — the existing `GET /me` does `db.select().from(users).where(eq(users.id, u.id))`, so the PATCH mirrors that with `db.update(...).set(...).where(...).returning()`). The web app reads/writes server-side through `lib/resources.ts` (parsing responses against the contract), mutates via a `'use server'` action, and `revalidatePath`s `/settings` and `/`.

**Tech Stack:** NestJS 11 + Drizzle ORM (Postgres), Zod (contracts, `^3.25`), Next.js App Router (server components + server actions), React 19, `@spendlio/ui` (`Card`, `Avatar`, `Badge`, `Button`, `Input`, `Select`). Tests: Vitest. NOTE: `@spendlio/ui` `Select` is delivered by plan `2026-06-15-00-ui-package-foundation.md` (Task 4) — that plan must be completed first.

---

## Context the worker must know (read before starting)

- **`UpdateUserInput` already exists** in `packages/contracts/src/user.ts` as `CreateUserInput.partial()` and is exported via the barrel. It is currently a *full* partial — it would accept `email`, `locale`, `timezone`, `avatarUrl` too. **This slice deliberately narrows it** to only the user-editable preference fields (`name`, `defaultCurrency`) so the API surface cannot mutate email/locale/timezone. Task 1 redefines `UpdateUserInput` to `UserSchema.pick({ name: true, defaultCurrency: true }).partial()`. (`CreateUserInput` is untouched — it is used by the seed/create path.)
- **There is no fixed currency enum in contracts.** `CurrencyCode` (in `packages/contracts/src/money.ts`) is `z.string().length(3).toUpperCase()` (a generic ISO-4217 length check). The same file exports `CURRENCY_DECIMALS` (a `Record<string, number>` of 17 supported currencies). The UI `Select` options are derived from `Object.keys(CURRENCY_DECIMALS)`; validation stays `CurrencyCode`. This is the existing "supported set" — reuse it, do not invent a new enum.
- **`MeController` uses the injected `db` client directly** (`@Inject(DB)`), not a service. The PATCH handler stays in the controller, same as `GET /me`.
- **`apps/api` has NO test runner yet** (no `vitest`, no `test` script in `apps/api/package.json`). Task 2 adds Vitest as a devDependency + a `test` script, and an `apps/api/vitest.config.ts`, then writes a controller unit test that injects a fake `db`. This is the smallest setup that lets us assert scoping + validation without a live Postgres.
- **The DB `updated_at` column does not auto-update on UPDATE** (it only `defaultNow()` on insert). The PATCH sets `updatedAt: new Date()` explicitly, matching how other write paths in this repo bump it.
- `UserSchema` parses `defaultCurrency` with `CurrencyCode` whose `.toUpperCase()` transform normalizes case; the API stores whatever Drizzle is given, so the action/DTO should pass an already-validated (upper-cased) value.

---

## Task 1: Contracts — narrow `UpdateUserInput` + test it

**Files:**
- Modify: `packages/contracts/src/user.ts`
- Modify: `packages/contracts/src/contracts.test.ts` (append a describe block)

- [ ] **Step 1: Write the failing test** — append to `packages/contracts/src/contracts.test.ts`

```ts
import { UpdateUserInput } from './index';

describe('UpdateUserInput (settings)', () => {
  it('accepts a partial update of name and defaultCurrency', () => {
    const r = UpdateUserInput.parse({ name: 'Mauricio', defaultCurrency: 'ars' });
    expect(r.name).toBe('Mauricio');
    expect(r.defaultCurrency).toBe('ARS'); // CurrencyCode upper-cases
  });

  it('accepts an empty object (no-op patch)', () => {
    expect(UpdateUserInput.parse({})).toEqual({});
  });

  it('rejects an invalid currency length', () => {
    expect(() => UpdateUserInput.parse({ defaultCurrency: 'PESOS' })).toThrow();
  });

  it('does not carry email/locale/timezone through', () => {
    const r = UpdateUserInput.parse({ name: 'X', email: 'a@b.com', locale: 'es-AR' } as any);
    expect(r).toEqual({ name: 'X' }); // unknown keys are stripped, not editable
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @spendlio/contracts test -- -t "UpdateUserInput (settings)"`
Expected: FAIL — the "does not carry email/locale/timezone through" case fails because the current `UpdateUserInput = CreateUserInput.partial()` still includes `email`/`locale`/`timezone`, so `r` would contain `email`/`locale`.

- [ ] **Step 3: Narrow `UpdateUserInput`** in `packages/contracts/src/user.ts`

Replace the existing definition (lines 19–20):

```ts
export const UpdateUserInput = CreateUserInput.partial();
export type UpdateUserInput = z.infer<typeof UpdateUserInput>;
```

with:

```ts
// Settings (Slice F): only name + defaultCurrency are user-editable.
// (email/locale/timezone are managed elsewhere; not exposed to PATCH /me.)
export const UpdateUserInput = UserSchema.pick({ name: true, defaultCurrency: true }).partial();
export type UpdateUserInput = z.infer<typeof UpdateUserInput>;
```

`UserSchema.pick(...)` strips unknown keys by default (Zod object), so `email`/`locale`/`timezone` are ignored. `CreateUserInput` is unchanged.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @spendlio/contracts test -- -t "UpdateUserInput (settings)"`
Expected: PASS. Then run the full suite to confirm no regression: `pnpm --filter @spendlio/contracts test` — all PASS.

- [ ] **Step 5: Typecheck contracts**

Run: `pnpm --filter @spendlio/contracts typecheck`
Expected: 0 errors. (`UpdateUserInput` is re-exported via `export * from './user'` in `index.ts` — no barrel change needed; confirm `import { UpdateUserInput } from './index'` resolves.)

- [ ] **Step 6: Commit**

```bash
git add packages/contracts/src/user.ts packages/contracts/src/contracts.test.ts
git commit -m "feat(contracts): narrow UpdateUserInput to name + defaultCurrency"
```

---

## Task 2: API — set up Vitest + write a failing `PATCH /me` test

**Files:**
- Modify: `apps/api/package.json` (add `vitest` devDep + `test` script)
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/src/me/me.controller.spec.ts`

**Why a controller unit test (not e2e):** the controller is the unit that owns scoping + the DTO contract. We inject a fake `db` (a tiny chainable stub) so the test asserts (a) the update is scoped to `@CurrentUser().id`, (b) `name`/`defaultCurrency` are forwarded, (c) the Zod pipe rejects an invalid currency — all without a live Postgres.

- [ ] **Step 1: Add the test runner to `apps/api/package.json`**

In `devDependencies` add `"vitest": "^2.0.0"`. In `scripts` add:

```json
"test": "vitest run"
```

(Leave the existing `dev`/`start`/`typecheck` scripts unchanged.)

- [ ] **Step 2: Create `apps/api/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
```

- [ ] **Step 3: Install so the workspace picks up vitest**

Run: `pnpm install`
Expected: completes; `vitest` resolvable under `apps/api`.

- [ ] **Step 4: Write the failing test** — `apps/api/src/me/me.controller.spec.ts`

```ts
import { describe, it, expect, vi } from 'vitest';
import { UpdateUserInput } from '@spendlio/contracts';
import { ZodPipe } from '../common/zod.pipe';
import { MeController } from './me.controller';

const USER = { id: '00000000-0000-0000-0000-000000000001' };

/** Minimal chainable Drizzle stub that records the update call and returns one row. */
function fakeDb(returnedRow: Record<string, unknown>) {
  const calls: { set?: unknown; whereArg?: unknown } = {};
  const db = {
    update: vi.fn(() => ({
      set: vi.fn((v: unknown) => {
        calls.set = v;
        return {
          where: vi.fn((w: unknown) => {
            calls.whereArg = w;
            return { returning: vi.fn(async () => [returnedRow]) };
          }),
        };
      }),
    })),
  };
  return { db, calls };
}

describe('MeController PATCH /me', () => {
  it('updates only the current user with name + defaultCurrency, bumps updatedAt', async () => {
    const row = { id: USER.id, name: 'Mauricio', email: 'm@x.com', defaultCurrency: 'ARS', locale: 'en-US', timezone: 'UTC' };
    const { db, calls } = fakeDb(row);
    const ctrl = new MeController(db as any);

    const dto = UpdateUserInput.parse({ name: 'Mauricio', defaultCurrency: 'ars' });
    const result = await ctrl.update(USER, dto);

    expect(db.update).toHaveBeenCalledOnce();
    // the set payload carries the edited fields + a fresh updatedAt
    expect(calls.set).toMatchObject({ name: 'Mauricio', defaultCurrency: 'ARS' });
    expect((calls.set as any).updatedAt).toBeInstanceOf(Date);
    expect(result).toEqual(row);
  });

  it('rejects an invalid currency at the Zod pipe (never reaches the db)', () => {
    const pipe = new ZodPipe(UpdateUserInput);
    expect(() => pipe.transform({ defaultCurrency: 'PESOS' })).toThrow();
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `pnpm --filter @spendlio/api test -- -t "PATCH /me"`
Expected: FAIL — `ctrl.update` is not a function (the controller has no `update` method yet).

---

## Task 3: API — implement `PATCH /me`

**Files:**
- Modify: `apps/api/src/me/me.controller.ts`
- (no change to `me.module.ts` — the controller is already registered; no new provider)

- [ ] **Step 1: Implement the handler** — replace `apps/api/src/me/me.controller.ts` with:

```ts
import { Body, Controller, Get, Inject, NotFoundException, Patch, UseGuards } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { users } from '@spendlio/db';
import { UpdateUserInput } from '@spendlio/contracts';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ZodPipe } from '../common/zod.pipe';
import { DB } from '../db/db.module';

@UseGuards(AuthGuard)
@Controller('me')
export class MeController {
  constructor(@Inject(DB) private db: any) {}

  @Get()
  async me(@CurrentUser() u: { id: string }) {
    const [row] = await this.db.select().from(users).where(eq(users.id, u.id));
    if (!row) throw new NotFoundException();
    return row;
  }

  @Patch()
  async update(
    @CurrentUser() u: { id: string },
    @Body(new ZodPipe(UpdateUserInput)) dto: UpdateUserInput,
  ) {
    const [row] = await this.db
      .update(users)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(users.id, u.id))
      .returning();
    if (!row) throw new NotFoundException();
    return row;
  }
}
```

Notes that satisfy the Golden Rules:
- The `where` clause is `eq(users.id, u.id)` — the current user from the guard, never a client-supplied id. The DTO has no `id` field (it's `pick(name, defaultCurrency)`), so the client cannot retarget the row.
- `UpdateUserInput` (Zod) validates the body via `ZodPipe`; an invalid `defaultCurrency` yields a 400 before the db is touched.
- `...dto` spreads only the present keys (partial), so a `{ name }`-only patch leaves `defaultCurrency` untouched.

- [ ] **Step 2: Run the test to verify it passes**

Run: `pnpm --filter @spendlio/api test -- -t "PATCH /me"`
Expected: PASS — both cases green.

- [ ] **Step 3: Typecheck the API**

Run: `pnpm --filter @spendlio/api typecheck`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/package.json apps/api/vitest.config.ts apps/api/src/me/me.controller.ts apps/api/src/me/me.controller.spec.ts
git commit -m "feat(api): add PATCH /me to update current user's name + defaultCurrency"
```

---

## Task 4: Web data layer — add `updateMe()`

**Files:**
- Modify: `apps/web/lib/resources.ts`

- [ ] **Step 1: Import the write DTO type** — extend the existing `@spendlio/contracts` import block (it already imports `UserSchema, type User`). Add `type UpdateUserInput`:

```ts
  UserSchema,
  type User,
  type UpdateUserInput,
```

- [ ] **Step 2: Add `updateMe()`** below the existing `getMe()` (in the `// ---- Current user (settings) ----` section):

```ts
export function updateMe(input: UpdateUserInput): Promise<User> {
  return api.patch(`/me`, input, UserSchema);
}
```

This mirrors the other writes (`createTransaction`, `updateTransaction`): the request body is the contract DTO; the response is parsed against `UserSchema` so any API/contract drift surfaces here. The `x-user-id` header is added by `api` (server-only) — the client never sends a user id.

- [ ] **Step 3: Typecheck the web app**

Run: `pnpm --filter web typecheck`
Expected: 0 errors. (No barrel re-export needed for `updateMe`; the page imports it directly. `UpdateUserInput` is exported from `@spendlio/contracts`.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/resources.ts
git commit -m "feat(web): add updateMe() resource (PATCH /me)"
```

---

## Task 5: Web — settings server action

**Files:**
- Create: `apps/web/app/settings/actions.ts`

Mirror `apps/web/app/transactions/actions.ts`: a `FormSchema` parses the raw `FormData` strings, then we validate against the `contracts` DTO and call the resource, catching `ApiError`, and `revalidatePath` on success.

- [ ] **Step 1: Create `apps/web/app/settings/actions.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { UpdateUserInput } from '@spendlio/contracts';
import { updateMe } from '../../lib/resources';
import { ApiError } from '../../lib/api';

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** Field-level issues from a 400, keyed by field name. */
  fieldErrors?: Record<string, string[]>;
}

// The form sends strings; validate shape here, then against the contract DTO.
const FormSchema = z.object({
  name: z.string().min(1, 'Add a name.'),
  defaultCurrency: z.string().length(3, 'Pick a currency.'),
});

export async function updateMeAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = FormSchema.safeParse({
    name: formData.get('name'),
    defaultCurrency: formData.get('defaultCurrency'),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const input = UpdateUserInput.safeParse({
    name: parsed.data.name,
    defaultCurrency: parsed.data.defaultCurrency.toUpperCase(),
  });

  if (!input.success) {
    return { ok: false, fieldErrors: input.error.flatten().fieldErrors as Record<string, string[]> };
  }

  try {
    await updateMe(input.data);
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: 'Could not save your settings.' };
  }

  revalidatePath('/settings'); // re-render the profile card
  revalidatePath('/');         // base-currency change re-rolls overview totals
  return { ok: true };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/settings/actions.ts
git commit -m "feat(web): add updateMeAction server action for settings"
```

---

## Task 6: Web — editable settings form (client component)

**Files:**
- Create: `apps/web/app/settings/SettingsForm.tsx`

Mirror `AddTransactionForm.tsx`: `'use client'`, `useActionState` over the action, `Card` + `Input` + `Select` + `Button` from `@spendlio/ui`, inline field errors. Currency options come from `CURRENCY_DECIMALS` keys (the supported set). Read-only fields (email, locale, timezone) are displayed but not submitted.

- [ ] **Step 1: Create `apps/web/app/settings/SettingsForm.tsx`**

```tsx
'use client';

import { useActionState } from 'react';
import { Card, Avatar, Button, Input, Select } from '@spendlio/ui';
import { CURRENCY_DECIMALS, type User } from '@spendlio/contracts';
import { updateMeAction, type ActionResult } from './actions';

const CURRENCIES = Object.keys(CURRENCY_DECIMALS).sort();

const initial: ActionResult = { ok: false };

const labelStyle = {
  display: 'block',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--weight-medium)',
  color: 'var(--color-ink-muted)',
  marginBottom: 'var(--space-1)',
} as const;

/** Editable profile form: name + base currency. Read-only fields shown below. */
export function SettingsForm({ user }: { user: User }) {
  const [state, formAction, pending] = useActionState(updateMeAction, initial);
  const fieldError = (name: string) => state.fieldErrors?.[name]?.[0];

  return (
    <Card padding="lg">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <Avatar name={user.name} size="lg" />
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-xl)' }}>
            {user.name}
          </div>
          <div style={{ color: 'var(--color-ink-muted)', fontSize: 'var(--text-sm)' }}>{user.email}</div>
        </div>
      </div>

      <form action={formAction} style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <div>
          <label htmlFor="name" style={labelStyle}>Name</label>
          <Input id="name" name="name" defaultValue={user.name} invalid={!!fieldError('name')} required />
          {fieldError('name') ? <FieldError>{fieldError('name')}</FieldError> : null}
        </div>

        <div>
          <Select
            label="Default currency"
            name="defaultCurrency"
            defaultValue={user.defaultCurrency}
            options={CURRENCIES}
          />
          {fieldError('defaultCurrency') ? <FieldError>{fieldError('defaultCurrency')}</FieldError> : null}
        </div>

        {state.error ? <FieldError>{state.error}</FieldError> : null}
        {state.ok ? (
          <p style={{ color: 'var(--positive-500)', fontSize: 'var(--text-sm)', margin: 0 }}>Saved.</p>
        ) : null}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>

      <div style={{ marginTop: 'var(--space-5)' }}>
        <Row label="Locale" value={user.locale} />
        <Row label="Timezone" value={user.timezone} />
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: 'var(--space-3) 0',
        borderBottom: '1px solid var(--color-border)',
        fontSize: 'var(--text-sm)',
      }}
    >
      <span style={{ color: 'var(--color-ink-muted)' }}>{label}</span>
      <span style={{ fontWeight: 'var(--weight-medium)' }}>{value}</span>
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: 'var(--negative-500)', fontSize: 'var(--text-xs)', margin: 'var(--space-1) 0 0' }}>
      {children}
    </p>
  );
}
```

Notes:
- `Select` (from the UI foundation plan) renders a styled native `<select>`; passing `name="defaultCurrency"` forwards it to the underlying element via `...rest`, so it posts with the form. `defaultValue` makes it uncontrolled (matches `AddTransactionForm`'s uncontrolled inputs — no client `useState` needed).
- `--positive-500` / `--negative-500` are existing repo tokens (the latter is used in `AddTransactionForm`); confirm `--positive-500` exists in `styles.css` during typecheck/smoke — if absent, fall back to `--color-primary` for the "Saved." line.
- Read-only `email` is shown in the header; `locale`/`timezone` shown as `Row`s. None are submitted, so the API cannot change them.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: 0 errors. (Verifies `Select` is exported by `@spendlio/ui` — the UI foundation plan must be done first; if `Select` is missing, that plan's Task 4 is the blocker.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/settings/SettingsForm.tsx
git commit -m "feat(web): editable settings form (name + base currency)"
```

---

## Task 7: Web — wire the form into the settings page

**Files:**
- Modify: `apps/web/app/settings/page.tsx`

Keep the server component as the data reader (`getMe()` via `safe()`), the `PageHeader`, and the API-unreachable `Notice`. Replace the read-only profile `Card` with `<SettingsForm user={data} />` when data is present; keep the existing "No profile loaded" fallback `Card` for the null case.

- [ ] **Step 1: Update `apps/web/app/settings/page.tsx`**

```tsx
import { Card, Avatar, Badge } from '@spendlio/ui';
import { getMe, type User } from '../../lib/resources';
import { safe } from '../../lib/safe';
import { PageHeader } from '../_components/PageHeader';
import { Notice } from '../_components/Notice';
import { SettingsForm } from './SettingsForm';

export default async function SettingsPage() {
  const { data, error } = await safe<User | null>(() => getMe(), null);

  return (
    <div>
      <PageHeader eyebrow="Account" title="Settings" />

      {error ? (
        <Notice tone="warn">
          The API is not reachable yet. Your profile will appear once apps/api is running and the
          demo user is seeded.
        </Notice>
      ) : null}

      {data ? (
        <SettingsForm user={data} />
      ) : (
        <Card padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Avatar name="Demo User" size="lg" />
            <div>
              <p style={{ color: 'var(--color-ink-subtle)' }}>No profile loaded.</p>
              <Badge tone="neutral">Dev mode · demo user</Badge>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
```

(The local `Row` helper that lived in `page.tsx` moves into `SettingsForm.tsx` — remove it from `page.tsx`. `Card`, `Avatar`, `Badge` are still used by the fallback branch, so keep those imports.)

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: 0 errors. Confirm no unused-import lint complaint (`Row` is gone; `Card`/`Avatar`/`Badge` remain in use by the fallback).

- [ ] **Step 3: Manual smoke note** (with the full stack running via `pnpm dev` / mprocs, Postgres seeded with the demo user):
  - Visit `/settings`. The form shows the demo user's current name and a currency `Select` defaulted to their `defaultCurrency`; email/locale/timezone are displayed read-only.
  - Change the name and pick a different currency → **Save changes** → "Saved." appears; reload `/settings` and the new values persist (proves `PATCH /me` wrote and the read re-fetched).
  - Visit `/` (overview) → totals reflect the new base currency (the action revalidated `/`).
  - Stop `apps/api` → reload `/settings` → the warn `Notice` renders and the "No profile loaded" fallback shows (graceful degradation unchanged).
  - Submit an invalid currency is not reachable through the `Select` (closed set); the server still rejects anything non-3-char via the contract — confirmed by the contract + API tests in Tasks 1–3.

- [ ] **Step 4: Update `PROGRESS.md`** — tick the Slice F row, set status + date, add a Build-Log entry (per CLAUDE.md "How to work").

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/settings/page.tsx PROGRESS.md
git commit -m "feat(web): make settings page editable (name + base currency)"
```

---

## Final verification

- [ ] `pnpm --filter @spendlio/contracts test` — all PASS (incl. new `UpdateUserInput` block).
- [ ] `pnpm --filter @spendlio/api test` — PATCH /me scoping + validation PASS.
- [ ] `pnpm --filter @spendlio/contracts typecheck && pnpm --filter @spendlio/api typecheck && pnpm --filter web typecheck` — all 0.
- [ ] Manual smoke (Task 7 Step 3) passes against the running stack.

---

## Self-review notes

- **Golden Rules:** input validated by a `contracts` Zod schema (`UpdateUserInput`) at the API edge via `ZodPipe`; the update is scoped to `@CurrentUser().id` only and the DTO carries no `id`, so a client cannot mutate another user's row; money/currency stays a validated `CurrencyCode` string (no floats involved here).
- **Surgical:** `CreateUserInput` and the seed path are untouched; the only contract change is narrowing `UpdateUserInput` (which the API now consumes for the first time). The settings `page.tsx` keeps its existing reader/Notice/fallback; the read-only fields move (not rewrite) into the form component.
- **No vendor drift:** the currency set reuses the existing `CURRENCY_DECIMALS` keys — no new enum, no new dependency. The only new dependency is `vitest` as an `apps/api` devDep, required because the API had no test runner (smallest setup to satisfy the plan's "API test for PATCH /me" requirement).
- **Watch-outs flagged for the implementer:** (1) `@spendlio/ui` `Select` is a hard dependency from the UI-foundation plan — do that plan first; (2) confirm `--positive-500` exists in the UI tokens, else use `--color-primary` for the success line; (3) the DB `updated_at` is bumped explicitly because the schema does not auto-update it on UPDATE.
```