# 07 · Queues & background jobs

## Why we need a queue at all

Some work is **slow, external, or scheduled** and must not block an HTTP response:

- **OCR** a receipt image — seconds, calls a vision service, can fail.
- **AI-categorize** a transaction — an LLM call.
- **Run recurring transactions** — every day, create the due ones.
- **Generate the monthly recap** — aggregate a whole month per user.
- **Send notifications/reminders** — settle-up nudges, budget alerts.

If these ran inside the request, users would wait (and time out), and a transient failure would lose work. A **queue** lets the API say "I accepted your receipt" instantly, then process it reliably in the background — with retries.

## 🟡 The tool: BullMQ on Redis

- **BullMQ** is a mature Node job queue; **Redis** is its backing store.
- Gives us: delayed jobs, **repeatable (cron) jobs**, automatic **retries with backoff**, concurrency limits, and a dashboard (Bull Board) to watch jobs.
- **Alternatives:** a Postgres-based queue (e.g. `pg-boss`) avoids adding Redis — simpler infra, fewer moving parts, slightly less throughput. **Worth considering if we want to keep infra minimal.** We'll pick in [`decisions.md`](./decisions.md); BullMQ is the default for its cron + retry ergonomics. (We likely want Redis anyway for caching/sessions.)

## The pipelines

```
POST /receipts ──▶ [ocr] ──▶ [categorize] ──▶ Receipt{parsed}
                                   ▲
POST /transactions (uncategorized)─┘

cron daily   ──▶ [recurring]   create due transactions
cron monthly ──▶ [recap]       build monthly_summaries per user ──▶ [notify]
events       ──▶ [notify]      budget exceeded · settle-up reminder
```

Each `[box]` is a **named queue** with its own worker and concurrency.

## Rules for writing jobs (learn these once)

1. **Idempotent.** A job may run twice (retries, redeploys). Design so running it again is safe — e.g. "create the recurring txn for 2026-06-01" checks if it already exists. Use a deterministic job id where possible.
2. **Small payloads.** Enqueue an **id**, not the whole object. The worker re-reads fresh data from the DB. (Never put a receipt image *in* the job — store it, pass the receipt id.)
3. **Explicit retries + backoff.** Transient failures (a flaky AI endpoint) retry with exponential backoff; on the **final** failed attempt the worker writes a durable row to the `dead_letters` table (ADR-029) and alerts — a real dead-letter queue with a `redriveDeadLetter()` re-enqueue helper, not just BullMQ's evictable `failed` set.
4. **Status on the row, not just the job.** A `Receipt` carries `status: processing | parsed | failed` so the client can show progress without knowing about queues.
5. **Workers are the same NestJS app** in worker mode — they reuse the same services and `db` client as the HTTP API. → [`05-api-nestjs.md`](./05-api-nestjs.md)

## Why the client polls (or subscribes)

After uploading a receipt, the client shows `processing`, then learns the result by **polling** `GET /receipts/:id` or via a **websocket** push. The mobile UI kit's scan sheet models the *parsed* end-state; in production it would show the processing → parsed transition. → `ui_kits/mobile/ReceiptScanSheet.jsx`

## Where the code lives (the placement decision) — ✅

A recurring question: do workers and jobs go in an app or a package? The rule follows the same "apps run, packages are pure libraries" principle as the rest of the monorepo:

| Piece | Lives in | Why |
|---|---|---|
| **Worker process** (consumes the queue) | **`apps/worker`** (its own app) | a worker is a *running process* with its own lifecycle, scaling, and failure domain — and it needs only `core/db/queue`, never `apps/api`. |
| **Job name + payload schema** | **`packages/contracts`** | "what a `categorize` job looks like" is a typed contract, shared by producer and consumer. |
| **The work a job performs** | **`packages/core`** | e.g. `computeMonthlyRecap(userId, month)` — pure, framework-free, **unit-testable without a queue**. |
| **Queue wiring** (Redis connection, typed `enqueue()`, queue registry) | **`packages/queue`** | thin infra both the API (producer) and workers (consumer) import. |
| **Enqueueing a job** (producer) | **`apps/api`** services | the transactions service calls `enqueue('categorize', { txnId })`. |

Two **separate apps** that share packages:

```
apps/api      → NestJS HTTP server. Producers enqueue jobs.
apps/worker   → BullMQ Worker processes. Imports core/db/queue/contracts — NOT apps/api.
        │  a processor is tiny:
        ▼  parse payload (contracts) → call core logic → persist via db
```

**Why a separate app, not a run-mode of `apps/api`?** Because the *work* lives in `packages/core`, the worker depends on `core/db/queue` and **nothing in `apps/api`** — so coupling them would be a false dependency. Separate apps deploy and **scale independently** (OCR/AI load is spiky — add worker replicas without touching the HTTP app) and **fail in isolation** (a stuck job can't exhaust the API event loop; an API deploy doesn't restart in-flight jobs). They still share every line of real logic via the packages — zero duplication.

## Deep dive: how BullMQ actually works (theory)

Worth understanding so failures don't surprise you.

- **A queue is Redis data structures.** BullMQ stores jobs as Redis hashes and moves their *ids* between lists/sorted-sets representing states: `wait → active → completed | failed`, plus `delayed` (a sorted set keyed by "run at" timestamp) and `paused`. Atomic **Lua scripts** move jobs between states so two workers can't grab the same job.
- **Reliability via "stalled" detection.** A worker that picks up a job must periodically renew a **lock** (a Redis key with a TTL). If the worker crashes, the lock expires, BullMQ marks the job **stalled** and another worker retries it. This is *at-least-once* delivery — which is exactly why jobs must be **idempotent** (see the rules above): a job can legitimately run twice.
- **Retries + backoff** are just the job being re-added to `wait`/`delayed` with an attempt counter; exhaust the attempts and it lands in `failed`. BullMQ's `failed` set is **evictable** (`removeOnFail` trims it), so the durable record of a permanently-failed job is the `dead_letters` table the worker writes on the final attempt (ADR-029) — that's what you inspect and `redriveDeadLetter()` from, not the `failed` set.
- **Delayed & repeatable (cron) jobs** sit in the `delayed` set; a worker promotes them to `wait` when their time arrives. Repeatable jobs (daily recurring run, monthly recap) are re-scheduled automatically after each run.
- **Concurrency** is per-worker (`new Worker(name, fn, { concurrency: 5 })`) — how many jobs that process handles at once. Total throughput = workers × concurrency. Tune per queue: OCR (slow, IO-bound) wants higher concurrency; CPU-heavy work wants less.
- **Backpressure & cost:** because everything is Redis, a flood of jobs grows Redis memory. Keep payloads to **ids**, set `removeOnComplete`/`removeOnFail` limits so finished jobs are trimmed, and you stay within a free Redis tier. → `10-local-dev-and-cost.md`

**Mental model:** BullMQ is a careful set of atomic Redis operations that gives you a durable, retryable to-do list with timers. Nothing magic — just Redis + Lua + locks.

