# 12 · Currency & FX (multi-currency)

> How Spendlio supports a preferred currency **and** spending/accounts in other currencies, with trustworthy totals. This is a core design decision — read it fully.

## The one rule everything follows
**Every monetary amount carries its own currency, and you never raw-sum amounts of different currencies.** `5000 ARS + 20 USD` is not a number — it's two numbers until you convert. The `Money` type (`{ amount, currency }`) enforces this at the type level.

## Two views over the same data
The whole feature is "one truth, two lenses":

1. **Native view — exact, no conversion.** Each expense is stored in the currency it happened in; each **Account has its own currency**. You see your **ARS** balance and your **USD** balance *separately*, each in its own tab — exactly like a multi-currency bank. No FX, no rounding ambiguity. This is the day-to-day, trustworthy view.
2. **Converted view — the roll-up.** Your chosen **base (display) currency** produces a single "everything" number, budgets, and cross-account totals by **converting** each amount with a stored FX rate. Always label it **"approx · as of <date>"** — it's an estimate, never presented as exact.

The "pesos / dollars tabs" you described **is** the native view. The single net-worth/total number is the converted view.

## Accounts are the currency buckets
- `Account.currency` already exists. A "Pesos account" and a "Dollars account" are two accounts. Balances roll up **per account** (and per currency) with zero conversion.
- The Accounts screen groups/tabs by currency: an **ARS** tab (peso accounts + peso totals), a **USD** tab, etc., plus an **"All"** tab that shows the converted grand total in the base currency.

## The user's base/display currency
- `User.defaultCurrency` is chosen at **onboarding** ("Which currency do you think in?") and editable in settings.
- It drives: the "All" total, budget amounts, the monthly recap headline, and any chart that mixes currencies.
- It is **display only** — changing it never rewrites stored transaction amounts (those keep their original currency forever).

## How a transaction stores currency
**Source of truth = the original amount + original currency. Never lose it.**
```
transaction.amount     // minor units in the ORIGINAL currency
transaction.currency   // the original currency (e.g. "ARS")
```
For fast, *stable historical* reporting we also store a **snapshot** of the conversion to the user's base currency at entry time:
```
transaction.fx = {
  baseCurrency,   // user's base at the time (e.g. "USD")
  baseAmount,     // minor units in base currency
  rate,           // ARS→USD rate used
  asOf,           // the rate's date
} | null          // null when original currency === base (no conversion needed)
```
Why snapshot? So **last month's total doesn't silently change** when today's exchange rate moves. A finance app must be auditable: the number you saw is the number that stays. (If the user later changes base currency, a background job recomputes snapshots against the new base.)

## Where rates come from: an `fx_rates` table
- A daily job pulls rates from a feed into `fx_rates(base, quote, date, rate)` (e.g. ECB/openexchangerates — free tiers exist; provider is an open decision, ADR-016).
- Conversions use the rate **for the transaction's date** (historical correctness), not just today's. Today's rate is only for "right now" balances.
- All FX math stays in **integer minor units**; rate application rounds with a documented rule (round half-up to the target currency's minor unit). `core` owns this so it's done one way everywhere.

## Per-currency minor units (a correctness gotcha)
Minor-unit scale is **not** always 2 decimals: JPY has 0, USD/ARS have 2, BHD/KWD have 3. So `toMinorUnits`/`formatMoney` must use the **currency's exponent**, not a hard-coded ×100. `packages/contracts` ships a small `CURRENCY` registry (`{ code → decimals }`) and the helpers read it. `Intl.NumberFormat(locale, { style:'currency', currency })` formats correctly once you give it the major value.

## Splitting across currencies
- A split is computed **in the expense's currency** (everyone owes their share in ARS if the dinner was in ARS) — keeps the split math exact.
- At **settle-up**, show each person their share converted to *their* preferred currency as an approximation, but record the settlement in a single agreed currency. Don't net balances across currencies without conversion; track balances **per currency** (you might owe someone $10 and they owe you 500 pesos — two separate balances, or netted via FX at settle time with a shown rate).

## Budgets
Decision: budgets are set **in the base currency** and compare against the converted spend, **or** a budget can be scoped to one currency/account. Default: base-currency budgets (simplest mental model). Per-account-currency budgets are a later option. (Logged in `decisions.md`.)

## UX summary
- **Onboarding:** pick base currency.
- **Add expense:** currency defaults to the selected **account's** currency; user can override per expense.
- **Accounts:** tabs by currency (native, exact) + an "All" tab (converted, "approx · as of").
- **Totals/recap/budgets:** base currency, labeled approximate where converted.
- **Settle-up:** balances tracked per currency; FX shown explicitly when converting.

## Resolved → ADR-016 / ADR-042
Rates provider + refresh cadence + the exact rounding rule are now decided: the provider is **Frankfurter** (ECB data, free, no key) behind a `RatesProvider` interface (offline static default + live adapter, env-gated), refreshed **daily** (a BullMQ scheduler + a run at boot), with conversion rounding **half-up to the target currency's minor units** (`core.convertMinor`). Ingestion + snapshot-on-create posture is **ADR-042**. Everything else above is the model we build to.
