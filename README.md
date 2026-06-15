# Claude Code handoff — Spendlio

This package hands the Spendlio build to a developer using **Claude Code**. It contains everything needed to scaffold the foundation (monorepo + shared contracts + database + local infra) and, later, the apps — all driven by decisions already made and documented.

## What's in this bundle

| File / folder | What it is |
|---|---|
| `CLAUDE.md` | **project instructions for Claude Code** — put at the monorepo root; auto-loaded as context |
| `GETTING_STARTED.md` | exact quickstart commands, zero → running foundation |
| `docs/build/` | **step-by-step build guides with full, copy-ready file contents** (skeleton, docker, contracts, db, core) + acceptance checks |
| `BUILD_PLAN.md` | the phase map (Phase 1 detailed in `docs/build/`; Phases 2–5 outlined) |
| `ARCHITECTURE.md` | the system map (monorepo, stack, package graph, request lifecycle) |
| `docs/learning/` | the *why* knowledge base — ADR log, glossary, deep-dive theory |
| `DESIGN_REFERENCE.md` | how to use the design system + UI kits as the visual source of truth |

> The **canonical `contracts` source** and the **design system** (tokens, components, UI kits) live in the parent Spendlio project this bundle came from — that whole project becomes **`packages/ui` (`@spendlio/ui`)**. The contract Zod files are written out in full in `docs/build/03-contracts-package.md`. See `DESIGN_REFERENCE.md`.

## The decided stack (all ✅ — see `docs/learning/decisions.md`)

- **Monorepo:** pnpm workspaces + Turborepo
- **Web:** Next.js (App Router) · **API + workers:** NestJS (one app, two run-modes)
- **Shared:** `contracts` (Zod), `core` (pure domain logic), `db` (Drizzle), `queue` (BullMQ), `storage` (S3-compatible), `ui` (design system), `config`
- **Database:** PostgreSQL + Drizzle · **Money:** integer minor units (`bigint` cents), never floats
- **Queue:** BullMQ on Redis · **Auth:** Auth.js (web) + short-lived JWT to API · **API:** REST
- **Local infra:** Docker Compose (Postgres + Redis + MinIO), $0 · deploy cheap (free tiers or a ~$5/mo VPS)

**Still open** (don't block the foundation): AI/OCR providers + privacy posture; final hosting target.

## How to use this with Claude Code

1. Make a new folder, `git init`, and copy in `CLAUDE.md`, `ARCHITECTURE.md`, `DESIGN_REFERENCE.md`, and `docs/`.
2. Open it in Claude Code and say: **“Read `CLAUDE.md`, then follow `docs/build/` steps 01–05 in order, running each acceptance check.”**
3. Or follow `GETTING_STARTED.md` yourself — every step has the exact files and commands.
4. Keep `docs/learning/decisions.md` updated (it's a living ADR log) as new choices are made.

The golden rules to preserve (from the docs):
- **Dependencies point inward toward `contracts`;** `contracts` and `core` import no framework, DB, or React.
- **Money is integer cents** end-to-end; format only at the UI edge.
- **Workers are a run-mode of `apps/api`,** not a package; a job's payload is a contract, its work lives in `core`.
- **Validate every API input** with a `contracts` schema before business logic.
- **Target interfaces, not vendors** (storage/queue), so local↔prod is a config swap.
