# FX / multi-currency totals — design

**Date:** 2026-06-19
**Status:** Approved (brainstorm) → ready for implementation plan
**Resolves:** ADR-016 (multi-currency: rates provider + cadence + rounding were the open items)
**Touches:** `@spendlio/core` (pure FX math), `@spendlio/contracts` (job schema), `@spendlio/db` (seed), `apps/worker` (RatesProvider + daily cron), `apps/api` (snapshot on create; consumers already wired), `apps/web` (no-rate UX), `@spendlio/ai` (assistant rollup)

---

## 1. Context

ADR-016 already decided the multi-currency **model**; a surprising amount is **already wired**, but the seams that feed it are empty:

- **Decided + built:** every amount stores its original currency; `core/accounts.ts` has tested `pickRate`/`convertMinor`/`sumNet`; the global `fx_rates(base, quote, date, rate)` table exists; `transactions` has `fxBaseCurrency/fxBaseAmount/fxRate/fxAsOf` snapshot columns; `AccountsService.balances()` already computes a converted `baseBalance` via `convertMinor`; the web accounts "All" tab already consumes it; `computeRecap` already sums `fxBaseAmount` snapshots and reports a `skipped` count.
- **Empty / the open part of ADR-016:**
  1. `fx_rates` is **never populated** — no provider, no ingestion job, no seed rates.
  2. The transaction FX snapshot is **never written** — a literal `TODO` in `TransactionsService.create()`; the `fxBase*` columns are dead, which blocks `computeRecap` (it skips non-base rows).
  3. The assistant's cross-currency rollup is deliberately stubbed pending this (ADR-041).

This feature fills those seams: ingest rates + write snapshots → the already-wired consumers light up.

## 2. Goals & non-goals

**Goals**
1. **Rates ingestion** — a `RatesProvider` (offline default + live adapter) and a daily cron that upserts `fx_rates`, plus seeded rates for local/demo.
2. **Write the FX snapshot** on transaction create (unblocking `computeRecap`).
3. **Light up three converted-total consumers:** accounts "All" rollup, monthly recap totals, the assistant's `accountBalances` rollup.

**Non-goals (deferred follow-ups, recorded in the ADR)**
- Insights/Overview base-currency conversion (broader UI; the summarizers currently take the first transaction's currency).
- A snapshot-**recompute** job on base-currency change (handled gracefully instead — §6).
- Per-account-currency budgets (ADR-016 keeps budgets base-currency).
- Currency triangulation in `core` (avoided by per-base fetch — §4).

## 3. Architecture — where things live (golden rules #1 / #5 / #6)

- **Pure math → `@spendlio/core`.** `convertMinor`/`pickRate`/`sumNet` already exist. Add a pure `computeFxSnapshot(amountMinor, currency, baseCurrency, rates: RateRow[]) → FxSnapshot | null` (returns `{ baseCurrency, baseAmount, rate, asOf }`, or `null` when same-currency or no connecting rate). No framework, no network.
- **`RatesProvider` → `apps/worker`** (interface + offline static-table default + live Frankfurter adapter, env-gated). The cron job is its only consumer; it needs network, so it cannot live in `core`. Mirrors `@spendlio/ai`'s offline/live split without a new package. (Alternative considered: a `packages/fx` — deferred as premature; nothing else fetches rates.)
- **`apps/api` never calls the provider.** On transaction create it reads the global `fx_rates` rows + calls `core` to snapshot. The provider is purely an *ingestion* concern.

## 4. Rates ingestion

- New **`fx` repeatable job** added to the `QUEUES` registry (`contracts/jobs.ts`) + a worker consumer, scheduled **daily** (mirrors the existing `recurring`/`recap` cron wiring in `apps/worker`). Idempotent: **upsert** on `fx_rates`' unique `(base, quote, date)` (`onConflictDoNothing`/`onConflictDoUpdate`).
- The job fetches for **each distinct `users.defaultCurrency`** (`SELECT DISTINCT default_currency` — just `USD` today) → all supported currencies (`CURRENCY_DECIMALS` keys). Fetching **per-base** guarantees every user's base ↔ account-currency pair exists *directly*, so `convertMinor` needs **no triangulation**.
- **Live adapter = Frankfurter** (`https://api.frankfurter.app/latest?from=<BASE>`, ECB data, free, **no API key**, daily). Behind the `RatesProvider` interface so it's a config swap (golden rule #6). Bounded fetch timeout (mirror `@spendlio/ai`'s `AbortSignal.timeout`).
- **Offline default** = a small built-in static rate table (a handful of pairs for the supported currencies), deterministic, zero network — the default in dev/CI/tests, selected by env exactly like the AI provider (`getRatesProvider()` returns live only when, e.g., `FX_PROVIDER=frankfurter`).
- Rates stored as **exact decimal strings**; `date` = the provider's quote date (`YYYY-MM-DD`).

## 5. FX snapshot on create

When a transaction's `currency !== the user's base`, compute the snapshot from the latest `fx_rates` rows and persist `fxBaseCurrency/fxBaseAmount/fxRate/fxAsOf`. One pure `core` fn (`computeFxSnapshot`) + a thin "load latest rates for this user's base" read, called from every insert path:
- `TransactionsService.create()` (primary — replaces the `TODO`).
- The receipt-confirm path (`receipts.confirm()` creates the linked expense).
- The worker **recurring** insert (materializes occurrences).

If no connecting rate exists at create time → store nulls (the row is treated as "no snapshot" downstream and reported, never miscounted). Snapshot uses the **latest** rate as-of create time and is then immutable (historical stability).

## 6. Conversion model (ADR-016, made explicit)

- **Current balances** (accounts "All") → convert each per-currency balance at the **latest** rate (`convertMinor` over current `fx_rates`). *Already coded in `AccountsService.balances()`.*
- **Historical totals** (recap) → sum the stored **snapshots** so a closed month never silently moves.
- **Base-currency change — no recompute job.** Snapshots are self-describing via `fxBaseCurrency`. `computeRecap` becomes **base-aware**: `RecapTxn` gains `fxBaseCurrency`, and a snapshot is used **only when `fxBaseCurrency === the requested base`**; otherwise the row is treated as un-snapshotted and counted in `skipped` (reported, not miscounted). This handles the rare base-change edge honestly without a heavy backfill.

## 7. Consumers lit up

- **Accounts "All"** (`apps/web` + `AccountsService.balances()` already returns per-account `baseBalance`/`rateAsOf`): fix the **no-rate UX** — today a no-rate account is silently dropped, *understating* the total. Instead convert what we can and surface **"approx · as of {date} · N accounts not converted (no rate)"**. **Web-only change** — the API already returns each account's `baseBalance` (null when unconvertible), so the web counts the nulls itself; no API change.
- **Recap** (`computeRecap` already returns `skipped`): surface **"N excluded (no rate)"** in the recap view; the totals now reflect real snapshots.
- **Assistant** (`accountBalances` tool, `@spendlio/ai`): add a base-currency **grand total** alongside the existing per-account lines + per-currency subtotals, with the same "X excluded (no rate)" honesty. Closes the ADR-041 follow-up. (The tool reads the user's base + `fx_rates` + `core`.)

All converted figures are labeled **"approx · as of <date>"** — never presented as exact.

## 8. Seed & demo

Add **non-USD** demo data so the feature is visible: one **EUR** and one **ARS** account with a few transactions each, plus seeded **`fx_rates`** (USD↔EUR, USD↔ARS for a recent date). Idempotent (fixed UUIDs + `onConflictDoNothing`), matching the existing seed style. Verifies the accounts "All" rollup and a multi-currency recap actually compute.

## 9. Rounding (ratifies ADR-016's open item)

Half-up to the **target currency's** minor units — exactly what `convertMinor` does via `Math.round` against `getCurrencyDecimals`. Rates stored as exact decimal strings (no float drift). Per-currency minor units already honored (`CURRENCY_DECIMALS`: JPY=0, USD/ARS=2, BHD=3, …).

## 10. Files touched

- `@spendlio/core`: `accounts.ts` (add `computeFxSnapshot` + its types) + `recap.ts` (`RecapTxn.fxBaseCurrency`, base-aware snapshot use) + tests.
- `@spendlio/contracts`: `jobs.ts` (`fx` queue + job payload schema).
- `apps/worker`: a `fx/` provider (interface + offline + live Frankfurter, env-gated) + the `fx` cron consumer + daily repeatable registration.
- `apps/api`: `TransactionsService.create()` (+ receipt-confirm) snapshot write via a shared helper. `AccountsService.balances()` needs **no change** — it already returns per-account `baseBalance` (null = unconvertible), which the web uses for the count.
- `apps/web`: accounts "All" no-rate UX; recap "N excluded" note.
- `@spendlio/ai`: `accountBalances` tool + wrapper — add the base-currency rollup.
- `@spendlio/db`: seed (non-USD accounts/txns + `fx_rates`).
- `docs/learning/decisions.md`: ADR-016 → resolved + a new ADR (rates-provider posture).

No new tables; the `fx_rates` table + transaction FX columns already exist (a seed-only data change, not a migration).

## 11. Testing & verification

- **Core unit tests:** `computeFxSnapshot` (same-currency → null, forward/inverse pair, no-rate → null, per-currency rounding) and base-aware `computeRecap` (snapshot used only on base match; mismatched/absent → `skipped`).
- **Worker:** offline `RatesProvider` shape test; the `fx` job upsert is idempotent.
- **Integration (`DATABASE_URL`-gated):** run the `fx` job → `fx_rates` populated; create a non-base transaction → snapshot written; `AccountsService.balances()` "All" converts; a multi-currency `computeRecap` totals correctly + reports `skipped`.
- **Seed check:** the demo shows a converted "All" total and a multi-currency recap.
- **Live (manual gate, like ADR-041):** the daily cron actually hits Frankfurter and upserts real rates with `FX_PROVIDER` set — recorded as a manual gate; offline + DB paths proven automatically.

## 12. ADRs

- **ADR-016 → ✅ resolved:** rates provider = Frankfurter (ECB) behind a `RatesProvider` interface; offline static default; **daily** cadence; **half-up to target minor units** rounding.
- **New ADR (rates-provider posture):** interface + offline-default + live-adapter (parallel to `@spendlio/ai`); lives in `apps/worker`; **per-base** fetch (no triangulation); snapshot-on-create; base-change handled by base-aware `computeRecap` (no recompute job); deferred follow-ups (Insights/Overview conversion, triangulation, per-account budgets).

## 13. Open judgment calls (made, overrule if you disagree)

- `RatesProvider` in `apps/worker`, not a new `packages/fx` (YAGNI — single consumer).
- **Per-distinct-user-base** fetch instead of a USD hub + triangulation (simpler; correct for all base↔account conversions, which is all converted totals ever need).
- Base change handled by exclusion-and-report, not a snapshot backfill job.
