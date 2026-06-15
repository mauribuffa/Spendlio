# 05 · The API — NestJS

> Grows as we build. The structure and rules are set; specifics get filled in per module.

## Why NestJS

A batteries-included, opinionated Node framework with first-class TypeScript, dependency injection, and a clear module system. The opinions are a feature here: every resource looks the same, so the codebase stays navigable as it grows. It also runs HTTP **and** queue workers from one app — see [`07-queues-jobs.md`](./07-queues-jobs.md).

## Module layout

One module per domain resource, each self-contained:

```
apps/api/src/
├─ app.module.ts
├─ common/            guards, interceptors, the Zod validation pipe
├─ db/                Drizzle client provider (from packages/db)
├─ transactions/     controller · service · (jobs)
├─ budgets/
├─ receipts/         + ocr worker
├─ splits/           splits, groups, settlements, balances
├─ categories/
├─ recap/            worker
├─ notifications/    worker
└─ auth/
```

- **Controller** = HTTP routes (thin: validate, call service, return).
- **Service** = business logic (calls `core` for domain math, `db` for persistence).
- **Worker** = queue consumer for that domain.

## The non-negotiable: validate at the edge

Every request body/query is parsed by a **Zod schema from `contracts`** via a custom validation pipe, *before* the service runs:

```ts
@Post()
create(@Body(new ZodPipe(CreateTransactionInput)) dto: CreateTransactionInput) {
  return this.txns.create(this.user.id, dto);
}
```

If it doesn't match the contract, the request is rejected with a 400 and a clear error — bad data never reaches business logic. → [`02-contracts.md`](./02-contracts.md)

## REST conventions (⬜ confirm)

- Resource-oriented: `GET/POST /transactions`, `GET/PATCH/DELETE /transactions/:id`.
- Money in JSON is **integer minor units + currency**, matching `contracts`.
- Lists are paginated (`?cursor=` over `?page=` for stable infinite scroll).
- **Alternative to plain REST:** **tRPC** (end-to-end typed calls, no client codegen) pairs beautifully with a TS monorepo — but Nest is REST-native and the mobile client benefits from a plain HTTP API. We'll decide REST vs tRPC-for-web in `decisions.md`.

*To document as we build each module: error format, auth guard wiring, pagination helper, the ZodPipe.*
