# Spendlio — Architecture

> The system map. Start here, then dive into `docs/learning/` for the *why* behind each decision.

Status legend: **✅ Decided** (you confirmed it) · **🟡 Proposed** (my recommendation, confirm or change) · **⬜ Open** (we'll decide together).

---

## 1. What we're building

Spendlio is a personal-finance + expense-splitting product with a **mobile app** and a **web app**, backed by one API. It does money tracking, budgets, splitting & settlement, receipt OCR, AI categorization, an AI chat over your data, recurring transactions, and monthly recaps.

That feature set drives three architectural needs:
1. **Shared types** between web, mobile, and API so money/transaction/split shapes never drift → a **`contracts`** package.
2. **Background processing** for OCR, AI categorization, recurring runs, recap generation, and notifications → a **queue**.
3. **One design language** across both clients → the **design system** (this project).

---

## 2. The stack

| Layer | Choice | Status |
|---|---|---|
| Monorepo | **pnpm workspaces + Turborepo** | ✅ |
| Web app | **Next.js** (App Router) — `apps/web` | ✅ |
| API | **NestJS** — `apps/api` (HTTP) | ✅ |
| Workers | **`apps/worker`** — separate app (BullMQ consumers) | ✅ |
| Shared contracts | **`packages/contracts`** (Zod schemas → inferred types + DTOs + job payloads) | ✅ |
| Domain logic | **`packages/core`** (framework-agnostic: money math, split/settlement, job work) | ✅ |
| Database | **PostgreSQL** | ✅ |
| ORM | **Drizzle** | ✅ |
| Money | **integer minor units (`bigint` cents)** | ✅ |
| Queue | **BullMQ on Redis** (`packages/queue` wiring) | ✅ |
| Blob storage | **S3-compatible** — MinIO local → R2/S3 prod (`packages/storage`) | ✅ |
| Validation | **Zod** (shared via contracts) | ✅ |
| Auth | **Auth.js (web) + short-lived JWT to API** | ✅ |
| Local infra | **Docker Compose** (Postgres + Redis + MinIO), $0 | ✅ |
| AI / OCR | LLM for categorization + chat; vision/OCR for receipts | ⬜ |
| Design system | **`packages/ui`** = this project (`@spendlio/ui`) | ✅ |

Every item traces to an ADR in [`docs/learning/decisions.md`](./docs/learning/decisions.md). Only AI/OCR providers and the final hosting target remain open.

---

## 3. Package graph

```
spendlio/
├─ apps/
│  ├─ web/                # Next.js — consumers of @spendlio/ui + contracts
│  ├─ api/                # NestJS — HTTP server
│  └─ worker/             # BullMQ consumers (separate deploy; imports core/db/queue, NOT api)
├─ packages/
│  ├─ contracts/          # Zod schemas + types + DTOs + job payload shapes (source of truth)
│  ├─ core/               # pure domain logic + the work jobs perform (no framework, no DB)
│  ├─ db/                 # Drizzle schema + migrations + client
│  ├─ queue/              # BullMQ connection + typed enqueue() + queue registry
│  ├─ storage/            # BlobStore interface (S3-compatible: MinIO/R2/S3)
│  ├─ ui/                 # the design system (tokens, components)  ← THIS PROJECT
│  └─ config/             # shared tsconfig / eslint / prettier
├─ docs/learning/         # the knowledge base (lives with the code)
└─ docker-compose.yml     # Postgres + Redis + MinIO for $0 local dev

dependency direction (arrows = "depends on"):
  web  ──▶ contracts, ui
  api  ──▶ contracts, core, db, queue, storage
  worker ──▶ contracts, core, db, queue, storage   (NOT api)
  core ──▶ contracts        db / queue / storage ──▶ contracts
```

**Rule:** dependencies only point *inward* toward `contracts`. `contracts` and `core` never import a framework, a DB driver, or React. **`apps/worker` is its own app** — it shares the *work* via `packages/core` (+ db/queue/storage) and depends on **nothing in `apps/api`**, so it deploys, scales, and fails independently. See [`docs/learning/07-queues-jobs.md`](./docs/learning/07-queues-jobs.md).

---

## 4. Where this design system fits

This project becomes **`packages/ui` (`@spendlio/ui`)**:
- `styles.css` + `tokens/` ship as the global stylesheet and CSS variables.
- `components/` become the published React components.
- `ui_kits/` are reference screens the app teams copy from (not shipped).

`apps/web` imports `@spendlio/ui`; the mobile app reuses the same tokens. The domain shapes the UI kits already mock (transactions, splits, budgets, receipts, recaps) are exactly what `packages/contracts` formalizes — see `contracts/` and `docs/learning/02-contracts.md`.

---

## 5. Request lifecycle (example: scan a receipt)

```
1. web/mobile  → POST /receipts (multipart image)            [validated by contracts]
2. api         → stores image, creates Receipt{status:processing}, enqueues "ocr" job
3. worker      → OCR job: extract line items  → AI "categorize" job
4. worker      → writes parsed items, sets Receipt{status:parsed}, emits event
5. web/mobile  → sees parsed receipt (poll or websocket), user confirms → POST /transactions
```

This is why OCR/AI must be **queue jobs**, not inline request handlers — see `docs/learning/07-queues-jobs.md`.

---

## 6. How to use the docs

`docs/learning/` is a **living knowledge base**. As we build with Claude Code, every meaningful choice gets:
- a short **"why this, not that"** in the relevant topic file, and
- a one-line entry in **`docs/learning/decisions.md`** (the ADR log).

Read `docs/learning/README.md` for the learning path.
