# Decisions log (ADRs)

A running list of **Architecture Decision Records**. Each is a tiny, dated note: what we decided, why, and what we considered. New decisions append here as we build. Status: ✅ Decided · 🟡 Proposed (awaiting your confirm) · ⬜ Open.

Format: `ADR-NNN · status · title` — context → decision → alternatives.

---

### ADR-001 · ✅ · Monorepo with shared `contracts` + `core`
- **Context:** web, mobile, and API share domain shapes; they must not drift.
- **Decision:** one repo; `contracts` is the single source of truth for types; `core` holds framework-free domain logic; dependencies point inward.
- **Alternatives:** multi-repo + published packages (rejected: version-bump friction, drift).

### ADR-002 · ✅ · Next.js (web) + NestJS (api)
- **Decision:** `apps/web` = Next.js App Router; `apps/api` = NestJS (HTTP + queue workers in one app).
- **Why:** you specified these; both are strong, TS-first, well-documented.

### ADR-003 · ✅ · pnpm + Turborepo
- **Decision:** pnpm workspaces for linking, Turborepo for cached task running.
- **Alternatives:** npm/yarn workspaces (weaker); Nx (more powerful, heavier) — revisit if we outgrow Turbo.

### ADR-004 · ✅ · Zod-based contracts
- **Decision:** define shapes as Zod schemas, infer TS types, reuse the schema for runtime validation on both sides. (In *this* design-system repo the `contracts/` draft is import-free TS; Zod is added when lifted to `packages/contracts`.)
- **Alternatives:** plain TS interfaces (no runtime check); OpenAPI-first codegen (heavier).

### ADR-005 · ✅ · Money = integer minor units, never floats
- **Decision:** store/compute money as integer cents + a currency code; format only at the UI edge.
- **Open sub-decision (ADR-006):** DB column type.

### ADR-006 · ✅ · Money column = `bigint` integer cents
- **Decision:** store money as **integer minor units** in a `bigint` column + a currency code; all math in integer cents in `core`; format only at the UI edge. (Chose this over `numeric` + decimal lib for exact, simple integer math.)

### ADR-007 · ✅ · PostgreSQL + Drizzle
- **Decision:** Postgres; Drizzle ORM (typed, SQL-close, great for learning).
- **Alternatives:** Prisma (more magic, codegen); raw SQL (more boilerplate).

### ADR-008 · ✅ · BullMQ + Redis for the queue
- **Decision:** BullMQ on Redis for OCR, categorization, recurring, recap, notifications.
- **Alternatives:** `pg-boss` (Postgres-only, less infra) — reconsider if we want to avoid Redis.

### ADR-009 · ✅ · Auth.js + short-lived JWT to the API
- **Decision:** Auth.js (NextAuth) handles web sessions; the API trusts short-lived JWT access tokens (mobile uses the same token flow). We own the data and learn the mechanics.
- **Alternatives:** Clerk/Auth0 (hosted, faster, costs); custom Nest JWT (most work).

### ADR-010 · ✅ · REST from NestJS (no tRPC for now)
- **Decision:** plain REST resources from Nest, serving both web and mobile. A typed client wrapper for web can come later if wanted; no tRPC for now.

### ADR-011 · ⬜ · AI/OCR providers & data posture
- **To decide:** OCR engine (multimodal LLM vs Textract/Document AI), LLM provider for categorization + assistant, and the privacy posture for financial data in prompts.

### ADR-012 · ✅ · Workers are a separate app (`apps/worker`); jobs split across packages
- **Decision:** workers run as their **own app** `apps/worker` (BullMQ consumers), importing `packages/{core,db,queue,storage,contracts}` and **nothing from `apps/api`**. Job name+payload schemas live in `packages/contracts`; the work in `packages/core`; queue wiring in `packages/queue`. Producers enqueue from `apps/api`.
- **Why:** the work lives in `core`, so the worker doesn't depend on the API — a separate app deploys/scales/fails independently (spiky OCR/AI load). Revised from an earlier "run-mode of apps/api" after review. Full reasoning in `07-queues-jobs.md`.

### ADR-013 · ✅ · Local infra in Docker; deploy as cheap as possible
- **Decision:** Postgres + Redis + MinIO run locally via one `docker-compose.yml` ($0 dev). For deploy we lean **free managed tiers** (Neon/Upstash/Cloudflare R2 + Vercel/Fly) or a **single ~$5/mo Hetzner VPS** running the same compose file. Final host picked at deploy time.
- **Why:** zero standing cost while learning; same env-var names local↔prod, only values change. See `10-local-dev-and-cost.md`.

### ADR-014 · ✅ · S3-compatible blob storage (MinIO local → R2/S3 prod)
- **Decision:** receipt images go to object storage behind a small `packages/storage` `BlobStore` interface; one S3-compatible implementation serves MinIO (local) and R2/S3 (prod). Uploads use pre-signed URLs (API never proxies bytes).
- **Why:** swap vendor by config, not code; R2 has zero egress fees.

### ADR-015 · ✅ · Learning docs go deeper (theory included)
- **Decision:** each topic gets concept + why + tradeoffs **and** a "Deep dive (theory)" section (e.g. DB indexing, BullMQ internals) as we build.

### ADR-016 · ✅ (model) / ⬜ (rates provider) · Multi-currency
- **Decision:** every amount stores its **original currency**; amounts are never raw-summed across currencies. **Two views:** native (per-account/-currency, exact, the "pesos/dollars tabs") and converted (the user's **base currency**, approximate, labeled "as of <date>"). Original amount+currency is the source of truth; transactions also store an **FX snapshot** to the base currency at entry time for stable historical totals. Minor-unit scale is **per-currency** (not always 2 decimals). Splits computed in the expense currency; balances tracked per currency.
- **Open:** rates provider (ECB/openexchangerates/…), refresh cadence, exact rounding rule.
- **Why / full model:** `12-currency-and-fx.md`.

### ADR-017 · ✅ (model) / 🟡 (tooling) · Internationalization
- **Decision:** i18n-ready from the start. `user.locale` and `user.timezone` are stored **separately from `defaultCurrency`** (locale ≠ currency). UI strings come from ICU message catalogs in the apps (not `contracts`/`core`); store category **keys**, translate labels in the UI; format numbers/dates/money via `Intl`; use logical CSS for RTL. Proposed tooling: `next-intl` (web), `i18next` (mobile).
- **Why / full guide:** `13-i18n.md`.

---

## Open questions parked for you
1. **AI/OCR providers + privacy posture** (ADR-011) — pick when we build the OCR/AI features.
2. **Final hosting target** (ADR-013) — free managed tiers vs a ~$5/mo VPS; decide at deploy time.
3. **FX rates provider + rounding rule** (ADR-016) — pick when we build multi-currency totals.

Everything else is decided ✅ — see the ADRs above.
