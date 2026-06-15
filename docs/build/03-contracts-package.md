# Build step 03 · `@spendlio/contracts`

Goal: the single source of truth — Zod schemas + inferred types + write DTOs + job payloads. No framework, no DB.

## Setup
```bash
mkdir -p packages/contracts/src
cd packages/contracts && pnpm init && cd ../..
pnpm --filter @spendlio/contracts add zod
```
**`packages/contracts/package.json`** (key fields)
```json
{
  "name": "@spendlio/contracts",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "typecheck": "tsc --noEmit", "test": "vitest run" },
  "dependencies": { "zod": "^3.23.0" }
}
```
Add `packages/contracts/tsconfig.json` (the pattern from step 01).

## Source files

**`src/money.ts`**
```ts
import { z } from 'zod';

export const CurrencyCode = z.string().length(3).toUpperCase(); // ISO 4217
export type CurrencyCode = z.infer<typeof CurrencyCode>;

export const Money = z.object({
  amount: z.number().int(),   // minor units in `currency`; negative = expense
  currency: CurrencyCode,
});
export type Money = z.infer<typeof Money>;

// Minor-unit exponent per currency (NOT always 2: JPY=0, BHD=3). Default 2.
export const CURRENCY_DECIMALS: Record<string, number> = {
  USD:2,EUR:2,GBP:2,ARS:2,BRL:2,MXN:2,CAD:2,AUD:2,CHF:2,CNY:2,INR:2, JPY:0,KRW:0,CLP:0, BHD:3,KWD:3,TND:3,
};
export const getCurrencyDecimals = (c: string) => CURRENCY_DECIMALS[c.toUpperCase()] ?? 2;
export const toMinorUnits = (major: number, c: string) => Math.round(major * 10 ** getCurrencyDecimals(c));
export const fromMinorUnits = (m: Money) => m.amount / 10 ** getCurrencyDecimals(m.currency);
export const formatMoney = (m: Money, locale = 'en-US') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency: m.currency }).format(fromMinorUnits(m));

// FX (multi-currency) — see docs/learning/12-currency-and-fx.md
export const FxSnapshot = z.object({
  baseCurrency: CurrencyCode,
  baseAmount: z.number().int(),   // minor units in base currency
  rate: z.number(),               // original -> base rate used
  asOf: z.string(),               // YYYY-MM-DD
});
export type FxSnapshot = z.infer<typeof FxSnapshot>;
```
> Money is **per-currency minor units** and is never summed across currencies. The full multi-currency model (base currency, native vs converted views, the “bank tabs”) is in `docs/learning/12-currency-and-fx.md`.

**`src/enums.ts`**
```ts
import { z } from 'zod';

export const CategoryKey = z.enum([
  'groceries','dining','transport','housing','utilities','shopping',
  'health','entertainment','travel','subscriptions','income','transfer',
]);
export type CategoryKey = z.infer<typeof CategoryKey>;

export const CategoryKind = z.enum(['expense','income','transfer']);
export type CategoryKind = z.infer<typeof CategoryKind>;

export const AccountType = z.enum(['card','checking','savings','cash']);
export type AccountType = z.infer<typeof AccountType>;

export const TransactionSource = z.enum(['manual','import','ocr','recurring']);
export type TransactionSource = z.infer<typeof TransactionSource>;

export const TransactionStatus = z.enum(['cleared','pending','split','recurring','income']);
export type TransactionStatus = z.infer<typeof TransactionStatus>;

export const SplitMode = z.enum(['even','exact','percent']);
export type SplitMode = z.infer<typeof SplitMode>;

export const ReceiptStatus = z.enum(['processing','parsed','failed']);
export type ReceiptStatus = z.infer<typeof ReceiptStatus>;

export const SettlementStatus = z.enum(['pending','settled']);
export type SettlementStatus = z.infer<typeof SettlementStatus>;
```

**`src/common.ts`**
```ts
import { z } from 'zod';

export const baseEntity = {
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
};
export const ownedEntity = { ...baseEntity, userId: z.string().uuid() };

export const Page = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ items: z.array(item), nextCursor: z.string().nullable() });
```

**`src/transaction.ts`** (the model to copy for the rest)
```ts
import { z } from 'zod';
import { ownedEntity } from './common';
import { CurrencyCode, FxSnapshot } from './money';
import { CategoryKey, TransactionSource, TransactionStatus } from './enums';

export const TransactionSchema = z.object({
  ...ownedEntity,
  title: z.string().min(1),
  merchant: z.string().nullable().optional(),
  amount: z.number().int(),                 // minor units in ORIGINAL currency
  currency: CurrencyCode,
  fx: FxSnapshot.nullable().optional(),     // snapshot conversion to base currency; server-set
  category: CategoryKey,
  accountId: z.string().uuid().nullable().optional(),
  occurredAt: z.coerce.date(),
  note: z.string().nullable().optional(),
  status: TransactionStatus,
  source: TransactionSource.default('manual'),
  receiptId: z.string().uuid().nullable().optional(),
  splitId: z.string().uuid().nullable().optional(),
  recurringId: z.string().uuid().nullable().optional(),
  deletedAt: z.coerce.date().nullable().optional(),
});
export type Transaction = z.infer<typeof TransactionSchema>;

export const CreateTransactionInput = TransactionSchema
  .omit({ id: true, userId: true, createdAt: true, updatedAt: true, deletedAt: true, fx: true })
  .extend({ category: CategoryKey.optional(), status: TransactionStatus.optional() });
export type CreateTransactionInput = z.infer<typeof CreateTransactionInput>;

export const UpdateTransactionInput = CreateTransactionInput.partial();
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionInput>;
```

**Author the remaining entity files the same way**, mirroring the shapes documented in the design-system project's `contracts/src/` and `docs/learning/03-database.md`:
`user.ts`, `account.ts`, `category.ts`, `budget.ts` (+ `BudgetStatus`), `receipt.ts` (+ `ReceiptLineItem`), `split.ts` (`Person`, `Group`, `SplitShare`, `Split`, `Settlement`, `Balance`), `recap.ts` (`MonthlySummary`, `CategorySpend`).

**`src/jobs.ts`** — job names + payloads live here (a job is a contract).
```ts
import { z } from 'zod';

export const QUEUES = {
  ocr: 'ocr',
  categorize: 'categorize',
  recurring: 'recurring',
  recap: 'recap',
  notify: 'notify',
} as const;
export type QueueName = typeof QUEUES[keyof typeof QUEUES];

export const OcrJob = z.object({ receiptId: z.string().uuid() });
export type OcrJob = z.infer<typeof OcrJob>;

export const CategorizeJob = z.object({ transactionId: z.string().uuid() });
export type CategorizeJob = z.infer<typeof CategorizeJob>;

export const RecapJob = z.object({ userId: z.string().uuid(), month: z.string() }); // YYYY-MM
export type RecapJob = z.infer<typeof RecapJob>;
```

**`src/index.ts`** — re-export everything (money, enums, common, every entity, jobs).

## Acceptance
```ts
import { TransactionSchema, CreateTransactionInput } from '@spendlio/contracts';
TransactionSchema.parse(sampleTransaction);          // passes for valid data
CreateTransactionInput.parse({ amount: 1.5 });       // throws (amount must be int cents)
```
`pnpm --filter @spendlio/contracts typecheck` is green.
