# Design: complete `packages/ui` + missing web pages + inline backend deltas

_Date: 2026-06-15 · Branch: `ui`_

## Goal

Implement the Spendlio design system (from the Claude Design handoff bundle) into the
real codebase, then build the product screens the design defines but the web app does
not yet have. Each new page ships with **real data end-to-end** — composing existing
API endpoints plus a few small, page-specific backend additions.

This is **not** a backend rebuild. The backend is ~90% complete (10 API controllers,
5 worker processors, full CRUD on the core domains). The work is: (1) restore + complete
the UI package, (2) add the missing frontend pages, (3) close a handful of small,
specific backend gaps inline.

## Locked decisions

- **Token vocabulary stays the repo's existing semantic layer** (`--color-primary`,
  `--space-4`, `--text-sm`, `--radius-md`, `--weight-semibold`, …). The web app references
  these throughout `globals.css` and page styles; switching to the bundle's raw names
  (`--green-600`, `--text-strong`) would break it. The repo's `styles.css` already encodes
  the bundle's exact color values (`#1B6E4F`, etc.) under these aliases.
- **Components are TypeScript `.tsx`**, authored in the repo's established pattern
  (`forwardRef`, props extend the relevant HTML attributes, inline `style` with CSS vars,
  plus a `.spl-*` className for `:hover` / `:focus-visible` / `:active` / `:disabled`
  states defined in `styles.css`). The bundle README says recreate in the target tech,
  not copy the prototype `.jsx`.
- **Fonts stay excluded from `styles.css`** — the web app loads the three families via
  `next/font` and aliases them to `--font-display/body/mono`. Repo convention preserved.
- **Icons use `lucide-react`** (already a `@spendlio/ui` dependency), not the bundle's CDN
  `data-lucide` pattern. Components that take an icon accept a `ReactNode` (a lucide-react
  element), matching the existing `CategoryIcon`.
- **Auth is parked.** Keep the demo-user header (`x-user-id`). No Auth.js, no login screen,
  no gated onboarding. "Set base currency" becomes an editable field in Settings instead of
  a standalone onboarding route.
- **Backend deltas are built inline** with the page that needs them.

## Non-goals

- Real authentication / sessions / JWT (CLAUDE.md marks Auth.js as "later").
- Mobile client (web is the active client; mobile is later).
- Re-styling existing pages beyond what's needed to consume new components.
- New endpoints for tables that have no page need yet (groups, group_members,
  recurring_rules UI, notifications UI, fx_rates admin).

---

## Part 1 — Foundation: complete `packages/ui`

### 1a. Restore the package from git (deletion is uncommitted; HEAD still has it)

Restore verbatim — these already match the design tokens/visuals, so rewriting them would
violate "surgical changes":

- Scaffolding: `package.json`, `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`,
  `cn.ts`, `styles.css`, `index.ts`
- 12 components (+ existing tests): `Button`, `Input`, `Card`, `Badge`, `Avatar`,
  `MoneyAmount`, `CategoryIcon`, `TransactionRow`, `ProgressBar`, `Stat`, `Toast`,
  `SegmentedControl`

Spot-check 2–3 against the bundle's `.d.ts`/`.jsx` for fidelity; do not rewrite working code.

### 1b. Add the 8 missing components (completes the full design system → 20 total)

Authored in the repo pattern, mapped to the repo's semantic tokens. Prop contracts taken
from the bundle `.d.ts` (icon strings → `ReactNode`):

**core/**
- `IconButton` — circular icon-only button. Props: `icon: ReactNode`, `label: string`
  (→ `aria-label` + `title`), `variant?: 'ghost'|'solid'|'brand'`, `size?: 'sm'|'md'|'lg'`.
- `Tag` — filter/category chip. Props: `selected?`, `selectable?` (→ `aria-pressed`),
  `color?: string|null` (leading dot), `icon?: ReactNode`, `onRemove?` (trailing ×).

**forms/**
- `Select` — styled native `<select>`. Props: `label?`, `options: (｛value,label｝|string)[]`,
  `value?`, `placeholder?`. Adds `.spl-select` focus styling.
- `Switch` — on/off toggle. Props: `checked?`, `onChange?`, `label?`, `disabled?`. Native
  checkbox input + styled track/thumb; respects motion tokens.
- `Checkbox` — Props: `checked?`, `onChange?`, `label?`, `round?` (circle variant for
  "who's in this split"), `disabled?`.
- `AmountInput` — money entry with currency prefix + tabular figures. Props: `value?`,
  `onChange?`, `currency?: string`, `size?: 'hero'|'compact'`.

**feedback/**
- `EmptyState` — Props: `icon?: ReactNode`, `title`, `message?`, `action?: ReactNode`.
- `Skeleton` (+ `SkeletonRow`) — shimmer placeholder. Props: `width?`, `height?`,
  `circle?`, `text?`. `SkeletonRow` = avatar + two lines + amount.

### 1c. Wire-up

- Extend `src/index.ts` barrel with the 8 new component + type exports.
- Add `.spl-select`, `.spl-switch`, `.spl-checkbox` state rules to `styles.css` for the new
  interactive controls (matching the existing `.spl-button` / `.spl-input` approach).

### Verify (Part 1)

`pnpm --filter @spendlio/ui typecheck` and `pnpm --filter @spendlio/ui test` pass.
`pnpm --filter web typecheck` still resolves all `@spendlio/ui` imports.

---

## Part 2 — Missing pages (each = page + data-layer wiring + inline backend delta)

Existing web pages: `/` (overview), `/transactions`, `/budgets`, `/split`, `/insights`,
`/settings` — all already fetch real data via `lib/resources.ts`. New pages follow the same
server-component-reads / server-action-writes pattern, wrapped in `safe()` for graceful
degradation, and add a nav entry in `app/_components/AppShell.tsx`.

### Slice A — Accounts (multi-currency "bank tabs")

- **Route:** `/accounts`. `SegmentedControl` tabs per currency (e.g. ARS / USD / All);
  each account shown as a `Card` with name, type, `last4` (mono), and its balance via
  `MoneyAmount`. "All" view rolls up converted totals (labeled approximate).
- **Data layer:** `listAccounts()` already exists but is unused. Add `getAccountBalances()`.
- **Backend delta:** add a **balance rollup** — `GET /accounts/balances` returning, per
  account, the net of its non-deleted transactions in the account's currency (+ converted
  to the user's base via the latest `fx_rates`). Core math in `packages/core`; thin
  controller/service in `apps/api`. Filter strictly by `user_id`.

### Slice B — Receipts / scan (OCR)

- **Route:** `/receipts`. List with status badges (processing / parsed / failed) using
  `Badge` + `Card`; a "scan receipt" upload affordance; detail view shows parsed merchant,
  total, line items, and a "create transaction from receipt" action.
- **Data layer:** backend is fully ready (`/receipts`, `/receipts/presign`, `/receipts/:id`,
  OCR worker). Add web resource functions: `listReceipts()`, `presignReceipt()`,
  `registerReceipt(key)`, `getReceipt(id)`. Upload = presign → client `PUT` → register.
  Status polling via revalidation.
- **Backend delta:** none (endpoints + worker exist).

### Slice C — Monthly recap (dedicated)

- **Route:** `/recap` (and/or `/recap/[month]`). Uses `getRecap(month)`: income/expense/net
  `Stat`s, category breakdown with `CategoryIcon` + `ProgressBar`, top merchant. Month picker
  via `SegmentedControl`/`Select`. `EmptyState` when the summary isn't built yet.
- **Backend delta:** none (`GET /recaps/:month` + recap worker exist).

### Slice D — Settle up

- **Route:** part of `/split` or a `/split/settle` view. Shows `getBalances()` (who owes
  whom per currency); "settle up" records a payment and updates balances.
- **Data layer:** add `listSettlements()`, `createSettlement(input)`.
- **Backend delta:** add `POST /settlements` (record `fromPersonId → toPersonId`, amount,
  currency) and `GET /settlements`. `settlements` table + contract already exist; balance
  math already nets settlements in `SplitsService`. Add a `Settlement` create DTO to
  `contracts` if missing; filter by `user_id`.

### Slice E — People management

- **Route:** `/people` (or expand the People section of `/split`). List people; add a person
  via a server action; show per-person balance.
- **Data layer:** `listPeople()` + `createPerson()` already exist. (Edit/delete are
  out of scope unless trivial.)
- **Backend delta:** none for create/list.

### Slice F — Base-currency preference (folded into Settings, not onboarding)

- **Route:** make `/settings` editable for `defaultCurrency` (and name) via a server action
  + `Select`/`Input`.
- **Data layer:** add `updateMe(input)`.
- **Backend delta:** add `PATCH /me` to update the user's `defaultCurrency` / `name`
  (currently `/me` is GET only). Validate with an `UpdateUserInput` contract.

### Sequencing

`Part 1` (foundation) → `A` → `B` → `C` → `D` → `E` → `F`. Each slice is independently
shippable and verifiable.

---

## Verification strategy

- **Per package:** `pnpm --filter @spendlio/ui typecheck|test`,
  `pnpm --filter @spendlio/contracts test` (new DTOs), `pnpm --filter @spendlio/core test`
  (balance/settlement math).
- **API:** typecheck + a focused test per new endpoint (`GET /accounts/balances`,
  `POST/GET /settlements`, `PATCH /me`), each asserting `user_id` scoping.
- **Web:** `pnpm --filter web typecheck`; manual smoke of each new route against the running
  stack (`pnpm dev` / mprocs) confirming real data renders and empty states degrade
  gracefully when the API is down.
- **Money:** all amounts integer minor units in `core`; format only at the UI edge via
  `MoneyAmount`. FX conversions labeled "approximate · as of <date>".

## Risks / open items

- **Account "All" rollup needs FX rates present.** If `fx_rates` is empty for a pair, the
  converted total should show "—" / "rate unavailable" rather than guess. (Rates provider
  remains a parked decision.)
- **Settlement direction & partial payments:** v1 records full named payments only; partial
  settlement UX can come later.
- **Receipt upload from a server-component app:** the `PUT` to the presigned URL happens
  client-side; confirm CORS on MinIO/S3 allows the browser `PUT` (already used by design;
  verify in local infra).
