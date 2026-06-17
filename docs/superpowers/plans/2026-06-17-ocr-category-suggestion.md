# OCR Category Suggestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Have the OCR vision model suggest a spending `CategoryKey` for a scanned receipt, pre-fill it into the review form, and make the user's reviewed category authoritative (no post-confirm overwrite).

**Architecture:** Add a `category` field to the OCR result schema (`@spendlio/ai`) so the vision model picks it while reading the receipt; it rides the existing `ocr` JSONB (no new DB column). Surface it on `ReceiptSchema` → pre-fill `ReceiptReviewForm`. On confirm, stop enqueuing the `categorize` job so the reviewed category isn't overwritten.

**Tech Stack:** TypeScript (strict), Zod (`@spendlio/contracts`), Vercel AI SDK + OpenAI/Anthropic (`@spendlio/ai`, Vitest), NestJS (`apps/api`), Next.js App Router (`apps/web`).

**Reference spec:** `docs/superpowers/specs/2026-06-17-ocr-category-suggestion-design.md`

**Branch:** `feat/ocr-category-suggestion` (already created; spec already committed there).

**Critical constraint:** OpenAI strict structured outputs require every property to be in the JSON-schema `required` array. So the new OCR field MUST be `category: CategoryKey.nullable()` — required-but-nullable — NOT `.optional()`/`.default()` (that's the bug we just fixed for `quantity`).

---

## Task 1: `@spendlio/ai` — add `category` to the OCR schema, mock, and prompt

**Files:**
- Modify: `packages/ai/src/provider.ts` (add field to `ReceiptOcrResult`)
- Modify: `packages/ai/src/offline/index.ts:34-44` (add category to the mock)
- Modify: `packages/ai/src/live/index.ts:84` (prompt text)
- Test: `packages/ai/src/ocr-schema.test.ts` (extend)

- [ ] **Step 1: Write the failing tests + keep the existing ones valid**

In `packages/ai/src/ocr-schema.test.ts`, FIRST update the existing `base` object (in the `describe('ReceiptOcrResult line items ...')` block) to include a category, so the existing line-item tests still pass once `category` becomes required:

```ts
  const base = {
    merchant: 'Demo Market',
    date: '2026-06-01',
    total: 1899,
    currency: 'USD',
    confidence: 0.5,
    category: 'groceries',
  };
```

THEN append a new describe block at the end of the file:

```ts
describe('ReceiptOcrResult.category (OCR-suggested spending category)', () => {
  const withItems = {
    merchant: 'Demo Market',
    date: '2026-06-01',
    total: 1899,
    currency: 'USD',
    lineItems: [{ description: 'Coffee', quantity: 1, amount: 1299 }],
    confidence: 0.5,
  };

  it('accepts a valid CategoryKey', () => {
    const r = ReceiptOcrResult.parse({ ...withItems, category: 'groceries' });
    expect(r.category).toBe('groceries');
  });

  it('accepts null (model unsure)', () => {
    const r = ReceiptOcrResult.parse({ ...withItems, category: null });
    expect(r.category).toBeNull();
  });

  it('requires the category field to be present (strict-output safe)', () => {
    expect(ReceiptOcrResult.safeParse(withItems).success).toBe(false);
  });

  it('rejects a non-CategoryKey value', () => {
    expect(ReceiptOcrResult.safeParse({ ...withItems, category: 'banana' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `pnpm --filter @spendlio/ai test -- src/ocr-schema.test.ts`
Expected: FAIL — e.g. "accepts a valid CategoryKey" gets `undefined` (the field is stripped because the schema has no `category` yet). The existing line-item tests still pass.

- [ ] **Step 3: Add `category` to `ReceiptOcrResult`**

In `packages/ai/src/provider.ts`, add the field to `ReceiptOcrResult` (after `confidence`). `CategoryKey` is already imported on line 2.

```ts
export const ReceiptOcrResult = z.object({
  merchant: z.string().nullable(),
  date: z.string().nullable(), // YYYY-MM-DD (purchase date), null if unreadable
  total: z.number().int(), // minor units
  currency: CurrencyCode,
  lineItems: z.array(OcrLineItem),
  confidence: z.number().min(0).max(1),
  // Best-fit spending category the vision model infers from the whole receipt.
  // `.nullable()` (not optional/default) keeps it in OpenAI strict-output `required`;
  // the model returns null when it is not confident.
  category: CategoryKey.nullable(),
});
```

- [ ] **Step 4: Add a category to the offline mock**

In `packages/ai/src/offline/index.ts`, add `category` to the mock `result` object (after `confidence: 0.5,`):

```ts
    const result = {
      merchant: 'Demo Market',
      date: '2026-06-01',
      total: 1899, // $18.99
      currency: 'USD',
      lineItems: [
        { description: 'Coffee beans', quantity: 1, amount: 1299 },
        { description: 'Oat milk', quantity: 2, amount: 600 },
      ],
      confidence: 0.5,
      category: 'groceries' as const,
    };
```

- [ ] **Step 5: Ask the live model for a category**

In `packages/ai/src/live/index.ts`, update the OCR user-text prompt (line 84) to request the category:

```ts
              { type: 'text', text: 'Extract the merchant, purchase date (YYYY-MM-DD), total, currency, line items, and the single best-fit spending category (use null if unsure).' },
```

- [ ] **Step 6: Run tests + typecheck**

Run: `pnpm --filter @spendlio/ai test -- src/ocr-schema.test.ts`
Expected: PASS (all line-item + category tests).

Run: `pnpm --filter @spendlio/ai test`
Expected: full suite green (no regressions).

Run: `pnpm --filter @spendlio/ai typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/ai/src/provider.ts packages/ai/src/offline/index.ts packages/ai/src/live/index.ts packages/ai/src/ocr-schema.test.ts
git commit -m "feat(ai): OCR infers a spending category (nullable, strict-output safe)"
```

---

## Task 2: `contracts` — surface `category` on `ReceiptSchema`

**Files:**
- Modify: `packages/contracts/src/receipt.ts:17-31` (add field to `ReceiptSchema`)
- Test (create): `packages/contracts/src/receipt-category.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/contracts/src/receipt-category.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ReceiptSchema } from './index';

const base = {
  id: '11111111-1111-1111-1111-111111111111',
  userId: '22222222-2222-2222-2222-222222222222',
  createdAt: '2026-06-17T00:00:00.000Z',
  updatedAt: '2026-06-17T00:00:00.000Z',
  imageKey: 'receipts/u/abc.jpg',
  status: 'parsed' as const,
};

describe('ReceiptSchema.category', () => {
  it('round-trips a category', () => {
    const r = ReceiptSchema.parse({ ...base, category: 'dining' });
    expect(r.category).toBe('dining');
  });

  it('accepts null', () => {
    const r = ReceiptSchema.parse({ ...base, category: null });
    expect(r.category).toBeNull();
  });

  it('is optional (absent is fine)', () => {
    const r = ReceiptSchema.parse(base);
    expect(r.category).toBeUndefined();
  });

  it('rejects an unknown category', () => {
    expect(() => ReceiptSchema.parse({ ...base, category: 'banana' })).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @spendlio/contracts test -- src/receipt-category.test.ts`
Expected: FAIL — "round-trips a category" gets `undefined` (field stripped; `ReceiptSchema` has no `category` yet).

- [ ] **Step 3: Add `category` to `ReceiptSchema`**

In `packages/contracts/src/receipt.ts`, add to `ReceiptSchema` immediately after the `transactionId` line. `CategoryKey` is already imported on line 4.

```ts
  category: CategoryKey.nullable().optional(),    // OCR-suggested spending category (from the ocr blob)
```

- [ ] **Step 4: Run test + typecheck**

Run: `pnpm --filter @spendlio/contracts test -- src/receipt-category.test.ts`
Expected: PASS (4 tests).

Run: `pnpm --filter @spendlio/contracts typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/receipt.ts packages/contracts/src/receipt-category.test.ts
git commit -m "feat(contracts): add receipt.category (OCR-suggested)"
```

---

## Task 3: `apps/api` — surface category + stop overwriting it on confirm

**Files:**
- Modify: `apps/api/src/receipts/receipts.service.ts` (`toReceipt`; `confirm`)

- [ ] **Step 1: Surface `category` from the `ocr` blob in `toReceipt`**

In `apps/api/src/receipts/receipts.service.ts`, update `toReceipt` (lines 130-137) to expose `category` from the OCR blob, alongside `lineItems`:

```ts
  private toReceipt(row: any) {
    const ocr = row.ocr ?? null;
    return {
      ...row,
      lineItems: Array.isArray(ocr?.lineItems) ? ocr.lineItems : [],
      category: ocr?.category ?? null,
      raw: ocr ?? undefined,
    };
  }
```

- [ ] **Step 2: Stop enqueuing `categorize` on confirm**

In the same file, in `confirm()`, REMOVE the categorization enqueue block (the comment + the `await enqueue('categorize', …)` call, currently lines 108-111) and replace it with a one-line note. The block to delete:

```ts
    // The transaction now exists — kick off categorization (jobId derives to
    // `categorize-<txnId>`, idempotent). OCR can't do this: at scan time there is
    // no transaction yet.
    await enqueue('categorize', { transactionId: txn.id });
```

Replace with:

```ts
    // No auto-categorize job here: the user's reviewed category (OCR-suggested,
    // editable) is authoritative — re-deriving it would risk overwriting their choice.
```

(`enqueue` stays imported — `create()` still uses it for the `ocr` job.)

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @spendlio/api typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/receipts/receipts.service.ts
git commit -m "feat(api): surface receipt.category; reviewed category authoritative on confirm"
```

---

## Task 4: `apps/web` — pre-fill the review form with the OCR category

**Files:**
- Modify: `apps/web/features/receipts/components/receipt-review-form.tsx` (prop + init)
- Modify: `apps/web/app/receipts/[id]/page.tsx` (pass the prop)

- [ ] **Step 1: Add a `suggestedCategory` prop and initialize state from it**

In `apps/web/features/receipts/components/receipt-review-form.tsx`, add `suggestedCategory` to the `Props` interface (after `categories`):

```ts
  categories: { value: string; label: string }[];
  /** OCR-suggested CategoryKey to pre-select (null/absent → user picks). */
  suggestedCategory?: string | null;
```

Add it to the destructured params (after `categories,`):

```ts
  categories,
  suggestedCategory,
}: Props) {
```

Change the category state initializer (currently `const [category, setCategory] = useState('');`) to:

```ts
  const [category, setCategory] = useState(suggestedCategory ?? '');
```

- [ ] **Step 2: Pass the suggestion from the detail page**

In `apps/web/app/receipts/[id]/page.tsx`, add the `suggestedCategory` prop to the `<ReceiptReviewForm ... />` call (after the `categories={...}` line):

```tsx
            categories={categories.map((c) => ({ value: c.key, label: c.label }))}
            suggestedCategory={receipt.category ?? null}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @spendlio/web typecheck`
Expected: no errors (`receipt.category` exists on the `Receipt` type from Task 2).

- [ ] **Step 4: Commit**

```bash
git add apps/web/features/receipts/components/receipt-review-form.tsx "apps/web/app/receipts/[id]/page.tsx"
git commit -m "feat(web): pre-fill receipt review category from OCR suggestion"
```

---

## Task 5: ADR + end-to-end manual acceptance

**Files:**
- Modify: `docs/learning/decisions.md` (append ADR-035)

- [ ] **Step 1: Append the ADR**

Append a new ADR to `docs/learning/decisions.md` (next number is **ADR-035**; confirm with `grep -oE "ADR-0[0-9]+" docs/learning/decisions.md | sort -u | tail -1`). Match the file's existing ADR format. Content:

> **ADR-035 — OCR suggests a spending category; reviewed category is authoritative.**
> The OCR vision model now infers a `CategoryKey` (`ReceiptOcrResult.category`, `.nullable()` so it stays OpenAI-strict-output-safe and the model can abstain) — it has the richest context (merchant + line items), so this beats a second rules/LLM pass on merchant text. The category rides the existing `ocr` JSONB (no new column) and is surfaced via `ReceiptSchema.category` to pre-fill the review form. Because the user reviews/edits it before approving, `receipts.confirm()` no longer enqueues the `categorize` job — the reviewed category wins and is not silently overwritten. The `categorize` job remains for non-receipt flows (manual/import/recurring). Constraining the suggestion to expense-only categories is deferred (the user catches the rare `income`/`transfer` misfire at review).

- [ ] **Step 2: Full typecheck across the monorepo**

Run: `pnpm typecheck`
Expected: all packages pass.

- [ ] **Step 3: Manual acceptance (requires Postgres + worker + a configured AI provider)**

Bring up infra/apps: `docker compose up -d`, `pnpm dev` (web + api), and the worker (`pnpm --filter @spendlio/worker dev`).

1. Scan a receipt in the web UI. When OCR finishes, open `/receipts/<id>`.
2. The **review form's Category is pre-selected** with the OCR's guess (offline provider → `groceries`; live model → its best-fit). If the model returned `null`/no key, the picker is empty (graceful).
3. Approve & add expense. Then confirm the category sticks — query Postgres:

```bash
docker compose exec -T postgres psql "$DATABASE_URL" -c \
  "select t.category from transactions t join receipts r on r.transaction_id = t.id order by t.created_at desc limit 1;"
```

Expected: the transaction's `category` equals the category you approved, and it is **not** changed afterward (the `categorize` job no longer runs for receipt confirms — verify no `[categorize]` log line fires for this transaction).

- [ ] **Step 4: Commit the ADR**

```bash
git add docs/learning/decisions.md
git commit -m "docs(adr): ADR-035 OCR category suggestion + reviewed category authoritative"
```

---

## Self-review notes (verified against the spec)

- **Spec coverage:** OCR infers category + strict-safe nullable (Task 1); offline mock + live prompt (Task 1); `ReceiptSchema.category` (Task 2); `toReceipt` surfaces it + `confirm` drops categorize (Task 3); review-form pre-fill from detail page (Task 4); ADR + manual e2e (Task 5). Every spec section maps to a task.
- **Type consistency:** `category` is `CategoryKey.nullable()` in `ReceiptOcrResult` (required-nullable, strict-safe) and `CategoryKey.nullable().optional()` on `ReceiptSchema` (surfaced from JSONB, may be absent on legacy rows). `suggestedCategory?: string | null` in the form matches `receipt.category ?? null` passed from the page. `toReceipt` returns `category: ocr?.category ?? null`.
- **Strict-output safety:** the new OCR field is `.nullable()`, never `.optional()`/`.default()` — does not reintroduce the `quantity` strict-mode rejection.
- **No-overwrite:** removing the single `enqueue('categorize', …)` in `confirm()` is the only behavior change to categorization; the job and all other enqueue sites are untouched.
