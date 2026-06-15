# 02 · The `contracts` package

> This is the heart of the architecture. If you understand this file, the rest follows.

## The problem it solves

The web app, the mobile app, and the API all need to agree on what a `Transaction` *is* — its fields, their types, which are required. Write that definition three times and they **will** drift. A field renamed on the backend becomes a silent runtime bug on the frontend.

The fix: **define each shape exactly once**, in a package every side imports.

## One definition, three uses

We define each shape as a **Zod schema** and *derive* the TypeScript type from it:

```ts
// packages/contracts/src/transaction.ts
import { z } from 'zod';

export const TransactionSchema = z.object({
  id: z.string().uuid(),
  amount: z.number().int(),          // minor units (cents) — see 03-database.md
  currency: z.string().length(3),    // ISO 4217, e.g. "USD"
  categoryId: z.string().uuid(),
  occurredAt: z.coerce.date(),
  // ...
});

export type Transaction = z.infer<typeof TransactionSchema>;   // ← the TS type, for free
```

That single `TransactionSchema` gives us:
1. **A TypeScript type** (`z.infer`) — compile-time safety in web + API.
2. **A runtime validator** — the API calls `TransactionSchema.parse(input)` to reject bad data *before* it reaches business logic.
3. **A form contract** — the web app validates inputs with the same schema, so client and server agree on what's valid.

> **🟡 Why Zod (not plain TS interfaces):** a plain `interface` only exists at compile time — it can't *check* data at runtime. Zod gives you the type **and** the validator from one declaration, so "what the type says" and "what we actually accept" can never disagree. The cost is a tiny runtime dependency. For trust software handling money, that's a great trade.

## DTOs: input vs output shapes

The full `Transaction` (with `id`, timestamps) is what the API **returns**. What a client **sends** to create one is smaller — no `id` yet. We model both:

```ts
export const CreateTransactionInput = TransactionSchema
  .omit({ id: true, createdAt: true, updatedAt: true });
export type CreateTransactionInput = z.infer<typeof CreateTransactionInput>;
```

Naming convention: `XSchema` / `X` for entities, `CreateXInput` / `UpdateXInput` for write DTOs, `XResponse` for read shapes when they differ from the entity.

## Contract-first vs database-first — ⬜ a real decision

Two valid philosophies for "where the source of truth lives":

- **Contract-first** (what this draft assumes): `contracts` defines the domain; the DB schema (Drizzle) is built to match. Good when the API shape is the product.
- **Database-first:** the Drizzle schema is the source of truth, and `drizzle-zod` *generates* Zod schemas from your tables. Less duplication, but your API shapes are tied to table shapes.

**My lean:** a hybrid — Drizzle owns the *persistence* shape, `contracts` owns the *API/domain* shape, and we use `drizzle-zod` to bridge where they're identical, hand-writing contracts where the API should differ from storage (e.g. computed `Balance`, the recap payload). We'll lock this in [`decisions.md`](./decisions.md) once you've read [`04-orm-drizzle.md`](./04-orm-drizzle.md).

## What's already drafted

The `contracts/` folder at the repo root is a **working draft** of this package, derived directly from what the UI kits already model:
`money`, `enums`, `user`, `account`, `category`, `transaction`, `budget`, `receipt` (OCR), `split` (people/groups/splits/settlements/balances), and `recap`. Read it alongside this doc — the design system and the contracts describe the *same* domain from two angles (pixels and types).
