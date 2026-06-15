# 03 · The database

**🟡 PostgreSQL.** A relational, ACID database. Spendlio's data is deeply relational (a transaction belongs to an account, a category, maybe a split, which has many people…) and money demands correctness — exactly Postgres's strengths. It also gives us `numeric` for exact decimals, JSONB for the messy OCR payload, and strong constraints.

## House rules for every table

- **Primary key `id`** — a UUID (v7 preferred: time-sortable, index-friendly) or a `cuid2`. Not auto-increment integers (they leak counts and make multi-service merges painful).
- **`created_at` and `updated_at`** — `timestamptz` (always store UTC; format in the client).
- **`user_id`** on every user-owned row — and **every query filters by it.** This is how we keep one user's data invisible to another. → [`08-auth-security.md`](./08-auth-security.md)
- **Soft delete** where history matters (transactions, receipts): a `deleted_at` column instead of a hard `DELETE`, so a recap or a settlement can still reference it.
- **Foreign keys with explicit `on delete` behavior** — money rows should rarely cascade-delete; prefer `restrict` or soft-delete.

## How we store money — ✅ the most important convention

> **Store money as an integer number of minor units (cents), with a separate currency code. Never use a floating-point type for money.**

```ts
// $24.50 USD  →
{ amount: 2450, currency: 'USD' }   // 2450 cents
```

### Why not floats?
`0.1 + 0.2 !== 0.3` in binary floating point. For money that's a bug factory — totals that are off by a cent, splits that don't reconcile. Floats are banned for money everywhere in the codebase.

### Integer cents vs Postgres `numeric` — the real choice
Both are *exact* (no float error). You hinted at Drizzle's `numeric`; here's the honest tradeoff:

| | **Integer minor units** (recommended) | **`numeric(14,2)`** |
|---|---|---|
| Exactness | ✅ exact | ✅ exact |
| Math in app code (JS) | ✅ plain integer math, fast | ⚠️ arrives as a **string** in JS (to avoid float) — you need a decimal lib to compute |
| Split / percentage math | ✅ integer cents + explicit remainder handling | ⚠️ rounding rules less obvious |
| Storage/representation | needs a known currency to interpret | human-readable in the DB |
| Multi-currency | ✅ trivial (units + code) | ✅ fine |

**Recommendation:** store **integer minor units** (`bigint`) in the DB and in `contracts`, because all our splitting and budgeting math is then exact integer arithmetic with no surprises. The currency code lives beside it. We format to "$24.50" only at the very edge (UI), using `Intl.NumberFormat`.

> If you'd rather keep `numeric` in Drizzle (it reads nicely in the DB and you said you like numeric for numbers), that's a legitimate choice — we'd then standardize on a decimal library (e.g. `decimal.js` / `dinero.js`) for *all* money math and never let it become a JS `number`. We log whichever we pick in [`decisions.md`](./decisions.md). My default is integer cents; `dinero.js` is a great companion either way.

### The splitting gotcha (worth learning now)
Split $10.00 three ways: $3.333… each. You can't store a third of a cent. The rule: divide in integer cents (333, 333, 333 = 999) and **assign the leftover cent deterministically** (e.g. to the payer, or round-robin). `core` will own this so it's done one way, everywhere. → [`packages/core`](./01-monorepo.md)

## The core tables (first cut)

Derived from the `contracts/` draft and the UI kits:

```
users
accounts          (card / checking / savings / cash)
categories        (groceries, dining, …; default + user-defined)
transactions      (amount cents, currency, category, account, status, source)
budgets           (category, period, limit cents)
recurring_rules   (template txn + cadence + next_run_at)
receipts          (image_url, status, ocr JSONB, merchant, total)
people            (your friends/roommates)
groups            (Roommates, Trip to Lisbon)  +  group_members
splits            (mode: even/exact/percent)   +  split_shares (person, amount)
settlements       (from, to, amount, status)
notifications
monthly_summaries (the recap payload)
```

Money columns are highlighted in [`04-orm-drizzle.md`](./04-orm-drizzle.md), where we map these to Drizzle.

> **✅ Decided:** money is stored as **integer minor units** in a `bigint` column (`amount`) alongside a `currency` code. All math is integer-cents in `core`; we format with `Intl.NumberFormat` only at the UI edge. Reasoning above; logged as ADR-005/006 in `decisions.md`.

## Deep dive: indexing (theory)

You asked for depth — indexing is the highest-leverage database topic, so here's the model.

### What an index *is*
A table is a heap of rows; finding "transactions for user X in May" without an index means scanning **every** row (a *sequential scan*). An index is a separate, **sorted** data structure (Postgres default: a **B-tree**) that maps column values → row locations, so the database can jump straight to matching rows in `O(log n)` instead of `O(n)`.

### B-tree mental model
A B-tree keeps keys sorted in a shallow, balanced tree. That makes it great for:
- **equality** (`user_id = $1`),
- **ranges** (`occurred_at >= $1 AND < $2`),
- **sorting** (`ORDER BY occurred_at DESC` can read the index in order, skipping a sort).

### Composite indexes & column order (the part people get wrong)
Our hottest query is "this user's transactions, newest first":
```sql
... WHERE user_id = $1 ORDER BY occurred_at DESC
```
The right index is **`(user_id, occurred_at DESC)`** — *order matters*. A composite B-tree is sorted by the first column, then the second within each first. So `(user_id, occurred_at)` can satisfy "filter by user, then already-sorted by date." The reverse `(occurred_at, user_id)` can **not** efficiently answer "this user's rows," because user_id isn't the leading key. Rule of thumb: **equality columns first, then the range/sort column last.**

### Selectivity — why not index everything
Indexes cost **write** time (every insert/update maintains them) and disk. An index only helps if it's **selective** (narrows to few rows). Indexing a boolean `is_settled` is near-useless (it splits the table in two). Index columns you **filter/join/sort by** with high selectivity: `user_id`, foreign keys, `occurred_at`.

### Covering indexes & `EXPLAIN`
- A **covering index** (`INCLUDE` extra columns) lets a query be answered *from the index alone* — an "index-only scan," no trip to the heap.
- **Always verify with `EXPLAIN (ANALYZE, BUFFERS)`.** It shows whether you got a `Seq Scan` (bad for big tables) or an `Index Scan`, the row estimates, and the actual time. Learning to read `EXPLAIN` is how you *prove* an index works rather than hoping.

### Our starting indexes
- `transactions (user_id, occurred_at DESC)` — the activity feed.
- every **foreign key** (`account_id`, `category_id`, `split_id`) — fast joins + lookups.
- `budgets (user_id, category)` — budget status.
- partial index `WHERE deleted_at IS NULL` on transactions — skip soft-deleted rows.

We add indexes **driven by real slow queries** (seen in `EXPLAIN`/logs), not speculatively — each one is a write-time tax.

