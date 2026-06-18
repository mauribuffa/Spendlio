# 00 · System overview

## The shape of the system

Spendlio is **two clients, one API, one database, and a pool of background workers.**

```
 ┌──────────┐     ┌──────────┐
 │  web     │     │  mobile  │     ← Next.js + (future) mobile; both use the design system
 └────┬─────┘     └────┬─────┘
      │  HTTPS (JSON, shapes from `contracts`)
      └────────┬───────┘
               ▼
         ┌───────────┐        ┌────────────┐
         │  API      │──jobs──▶│  Redis     │ (queue)
         │  (NestJS) │        └─────┬──────┘
         └─────┬─────┘              │
               │ SQL                ▼
               ▼              ┌────────────┐
        ┌────────────┐        │  Workers   │  OCR · AI categorize · recurring · recap · notify
        │ PostgreSQL │◀───────┤  (NestJS)  │
        └────────────┘  SQL   └────────────┘
```

The API and the workers are the **same NestJS codebase** running in two modes: one serves HTTP, the other consumes queue jobs. They share modules, the DB client, and `contracts`.

## Two kinds of work

Understanding this split explains most of the architecture:

| Synchronous (request → response) | Asynchronous (queued job) |
|---|---|
| Create/edit a transaction | OCR a receipt image |
| List transactions, budgets | AI-categorize a transaction |
| Compute who-owes-whom | Generate the monthly recap |
| Record a settlement | Send a reminder/notification |
| Ask the AI a question* | Run due recurring transactions |

\* The chat *call* is sync: the model orchestrates a set of read-only, `user_id`-scoped **tools** that query the DB on demand and return exact integer cents (the LLM never does money math) — see [`09-ai-ocr.md`](./09-ai-ocr.md). One of those tools (the monthly recap) reads the worker-built summaries; the rest query live aggregates.

**Why:** OCR and LLM calls take seconds and can fail/retry. If they ran inside an HTTP handler, the user would stare at a spinner and a timeout could lose data. Queues make slow work reliable and the UI snappy. → [`07-queues-jobs.md`](./07-queues-jobs.md)

## The data lifecycle of one expense

1. User taps **+** → fills amount/category, or **scans a receipt**.
2. Client validates the form against a `contracts` schema, POSTs it.
3. API validates again (never trust the client), writes the `Transaction`.
4. If uncategorized, a job asks the AI for a category; the row updates.
5. If split, a `Split` is created and per-person `Balance`s recompute.
6. The transaction shows up in Activity, budgets update, and it feeds the next monthly recap.

Every noun in that story (`Transaction`, `Split`, `Balance`, `Receipt`, `Budget`) is a type defined once in `contracts` and reused everywhere. That's the backbone — start with [`02-contracts.md`](./02-contracts.md).

## Why this is "boring" on purpose

Personal finance is **trust software**. We bias toward proven, debuggable tools (Postgres, a typed ORM, a standard queue) over novelty. The interesting parts (splitting math, OCR, AI) live in small, well-tested modules; everything around them is deliberately conventional so it's easy for you to reason about and learn from.
