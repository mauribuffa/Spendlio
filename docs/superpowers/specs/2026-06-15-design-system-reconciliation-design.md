# Design spec — Reconcile Spendlio to its real design system (full web)

**Date:** 2026-06-15
**Branch:** `design/reconcile-to-real-design-system`
**Status:** approved design → ready for implementation plan

## Context

A Claude Design handoff bundle (`spendlio-design-system`) is the **pixel-perfect, canonical** design for Spendlio: 8 token CSS files, 20 prototype components, and full web + mobile UI kits. The repo already has a working full-stack app whose `@spendlio/ui` (20 components) and `apps/web` pages were built **clean-room from a summary doc** and have drifted from the canonical system — most consequentially in **token vocabulary**.

This spec covers the **full web** reconciliation. The mobile UI kit is **out of scope** (no mobile app exists in the repo).

**Bundle source (read-only reference, archived in-repo):** `docs/design-bundle/`
— `tokens/`, `components/{core,data,forms,feedback}/*.jsx`, `ui_kits/web/*.jsx`, `assets/logo-mark*.svg`.

## Principles (non-negotiable)

1. **The bundle is the visual source of truth.** Where repo and bundle disagree, the bundle wins.
2. **Adopt the real token vocabulary wholesale.** Migrate every consumer; drop the old `--color-*` aliases. No back-compat translation layer.
3. **Translate, don't transplant.** Bundle components are prototypes (`window.SpendlioDesignSystem_*`, Lucide via CDN `data-lucide`). Recreate the *visual output* as real React/TS using `lucide-react` (already a dep). Match pixels, not prototype structure.
4. **Preserve all live data wiring.** `apps/web` pages fetch live API data via server components / actions / resources. Change **presentation only** — never the data flow, the server/client boundary, or `x-user-id` handling.
5. **Honor the repo's golden rules.** `@spendlio/ui` stays React-only (no framework/DB). Money stays integer minor units formatted at the UI edge. No new cross-package relative imports.

## Token vocabulary migration

Replace the hand-rolled `:root` block in `packages/ui/src/styles.css` with the bundle's 8 token files merged **in this order**: `colors → typography → spacing → radius → shadow → motion → base`. Keep the existing per-component `.spl-*` rules but re-point them at the new tokens. Fonts stay self-hosted via `next/font` — **do not** add the bundle's Google Fonts `@import`.

Canonical alias map (old repo token → new canonical token):

| Old (`--color-*` etc.) | New (canonical) |
|---|---|
| `--color-canvas` | `--surface-canvas` |
| `--color-surface` | `--surface-card` |
| `--color-ink` | `--text-strong` |
| `--color-ink-muted` | `--text-muted` |
| `--color-ink-subtle` | `--text-subtle` |
| `--color-border` | `--border-subtle` |
| `--color-primary` | `--action-primary` (fills) / `--surface-brand` (surfaces) |
| `--color-primary-ink` | `--green-900` / `--text-brand` |
| `--color-on-primary` | `--text-on-brand` |
| `--color-accent` | `--action-accent` |
| `--color-focus-ring` (+ ring) | `--focus-ring` / `--ring-brand` |
| `--font-body` | `--font-sans` |
| `--motion-fast` / `--ease-out` | `--dur-fast` / `--ease-standard` (+ `--transition-colors`, `--transition-control`) |

Also gained from the bundle (no old equivalent): `--surface-sunken/inset/inverse/brand-sub/overlay`, full `--positive-*`/`--negative-*`/`--warning-*`/`--info-*` scales, `--text-2xs/md/4xl/5xl/6xl` (px scale; **values differ** from the old rem scale — consumers shift intentionally), `--radius-lg/2xl/3xl` + role aliases, `--shadow-xs/brand/inset`, `--ring-brand/error`, motion durations/easings.

`apps/web/app/globals.css`: add a `--font-sans` alias onto the `next/font` Hanken variable (today only `--font-body` is aliased); update body/base rules to canonical tokens. `apps/web/app/layout.tsx` font wiring is unchanged.

## Scope by area

### 1. Foundation
- `packages/ui/src/styles.css` — merged token block + re-pointed `.spl-*` rules.
- `apps/web/app/globals.css` — `--font-sans` alias + canonical base tokens.

### 2. Components — `@spendlio/ui` (the 20)
Rewrite each to match its bundle counterpart's visual spec (variants, sizes, padding, radius, states). **Keep existing prop names** where `apps/web` already consumes them; reconcile an API only where the bundle's is clearly better, updating call sites in the same change. Bundle ↔ repo map is 1:1:

`core/`: Button, IconButton, Badge, Tag, Avatar, Card · `forms/`: Input, Select, Switch, Checkbox, SegmentedControl, AmountInput · `data/`: TransactionRow, MoneyAmount, CategoryIcon, ProgressBar, Stat · `feedback/`: Toast, EmptyState, Skeleton.

**Divider** and **Sparkline** appear in the bundle index but are added **only if a reskinned page uses them** (YAGNI).

Update each component's co-located Vitest test to the new tokens/markup. `pnpm --filter @spendlio/ui test` stays green.

### 3. Web chrome + pages — `apps/web`
- **Chrome** (`_components/AppShell.tsx`, `_components/PageHeader.tsx`):
  - Sidebar matches the bundle: 248px, active item on `--surface-brand-sub` with `--green-800` text, the "Ask Spendlio AI" card on `--green-900`, profile footer. Use the **real logomark SVG** (`assets/logo-mark.svg`, copied into the repo) instead of the current inline placeholder.
  - Add the bundle's **sticky, backdrop-blurred topbar** (search + Scan + Add-expense) — the app lacks it today. `PageHeader` becomes that topbar.
  - **Nav reconciliation (approved):** keep **all** existing routes (Receipts, People, Recap included) and arrange the sidebar to read like the bundle; nothing built is lost.
- **Pages** reskinned to pixel-match the kit references, presentation-only: Overview, Transactions, Accounts, Budgets, Split, Insights/Assistant, Settings. (Receipts, People, Recap inherit the new tokens/components but have no bundle reference page — reskin to match the system, not a specific mock.)
- **Chart primitives:** port the bundle's `Donut` (conic-gradient) and `BarChart` (div bars) into small web-app components used by Overview/Budgets.

### 4. New screens — Onboarding + Modals
- **Onboarding** (`ui_kits/web/Onboarding.jsx`) → a real screen wired to existing flows.
- **Modals** (`ui_kits/web/Modals.jsx` + the bundle web `Modal`) → add-expense, scan-receipt, settle-up dialogs as real components wired to the **existing** server actions that already back those flows (`transactions/actions.ts`, `receipts/actions.ts`, `split/actions.ts`). No new API endpoints.

## Out of scope
Mobile UI kit; new API endpoints / contracts / DB changes; Auth.js (still deferred); the bundle's duplicate `contracts/` and `docs/learning/` drafts (repo already has its own).

## Delivery sequence (approved: foundation-first)
1. **Foundation** — tokens + all 20 components. Gate: `pnpm -r typecheck`, `pnpm --filter @spendlio/ui test`, `pnpm --filter web build` all green. App stays buildable.
2. **Chrome + pages** — AppShell/topbar + page reskins + chart primitives. Gate: typecheck + `web build` green.
3. **Onboarding + Modals.** Gate: typecheck + `web build` green.

## Verification
No screenshots (per the bundle README — read source, don't render). Per checkpoint:
- `pnpm -r typecheck` clean.
- `pnpm --filter @spendlio/ui test` green (tests updated to new tokens/markup).
- `pnpm --filter web build` green.
- Structural token-by-token diff of `styles.css` against the merged bundle token files.
- Offer a live run of the app for a visual check at the end.

## Risks
- **Token-value shifts** (type scale rem→px, radius `sm/md` deltas) change spacing/sizing repo-wide; expected and intended (matching canonical). Catch regressions via build + visual run, not by pinning old values.
- **Prop-API drift** between bundle and repo components: mitigate by keeping repo prop names and updating call sites within the same change; typecheck is the backstop.
