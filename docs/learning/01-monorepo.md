# 01 · The monorepo

## What a monorepo is

One git repository holding **all** the code — both apps and the shared packages — instead of a separate repo per project. When you change a shared type, the app that uses it sees the change in the same commit. No version bumps, no "publish package then update consumer" dance.

## Why we want one here

Spendlio's web app, mobile app, and API all speak about the *same* things (a transaction, a split, a budget). If those shapes lived in separate repos they would drift, and a backend change could silently break a client. A monorepo lets the **`contracts`** package be a single, always-in-sync source of truth. → [`02-contracts.md`](./02-contracts.md)

## The tools — 🟡 Proposed

### pnpm workspaces (the package manager)
- **What:** pnpm installs dependencies and links the local packages together so `apps/web` can `import '@spendlio/contracts'` and get the local source.
- **Why pnpm, not npm/yarn:** it's fast, disk-efficient (one global store, hard-linked), and its workspace support is excellent. It's also strict about dependencies, which catches "you used a package you didn't declare" bugs early.

### Turborepo (the task runner)
- **What:** runs builds/tests/lint across packages in the right order and **caches** results. Change only `apps/web`? Turbo skips rebuilding everything else.
- **Why:** without it, "build everything" gets slow as the repo grows. With it, CI and local dev only redo what actually changed.
- **Alternative:** **Nx** — more powerful (generators, dependency graph visualizations) but heavier to learn. We start with Turborepo for simplicity and can adopt Nx later if we need its power.

## The dependency rule (the important part)

Dependencies point **inward**, toward the pure core:

```
apps (web, api)  ─▶  packages (contracts, core, db, ui)
core ─▶ contracts        db ─▶ contracts
```

Three packages are **"pure"** — they import no framework, no database driver, no React:
- `contracts` — just Zod + TypeScript.
- `core` — just TypeScript (uses `contracts`).

**Why purity matters:** pure code is trivial to unit-test (no mocking a database), runs anywhere (server, edge, a script), and can never accidentally couple your splitting math to, say, NestJS. If you ever find yourself importing `@nestjs/*` or a DB client into `core`, that's a smell — the logic belongs in the app, or the dependency belongs elsewhere.

## What each package is for

| Package | Holds | Imports |
|---|---|---|
| `contracts` | Zod schemas, inferred types, API DTOs, enums | nothing |
| `core` | money math, split calculation, settlement netting | `contracts` |
| `db` | Drizzle schema, migrations, the typed client | `contracts` |
| `ui` | design tokens + React components (this project) | React |
| `config` | shared `tsconfig`, `eslint`, `prettier` | nothing |
| `apps/web` | Next.js pages, server actions, UI composition | `ui`, `contracts` |
| `apps/api` | Nest HTTP controllers + queue workers | `contracts`, `core`, `db` |

## How we'll scaffold it (with Claude Code)

Rough order, each step documented as we go:
1. `pnpm init` + workspace config + Turborepo + `packages/config`.
2. `packages/contracts` (we already have a draft — see the `contracts/` folder).
3. `packages/db` (Drizzle schema from the contracts).
4. `apps/api` (Nest) wired to `db` + `contracts`.
5. `apps/web` (Next.js) wired to `ui` + `contracts`.
6. Queue + workers.

→ Decisions logged in [`decisions.md`](./decisions.md).
