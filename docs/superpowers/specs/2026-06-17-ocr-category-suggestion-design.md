# Design spec — OCR suggests a category for a scanned receipt

**Date:** 2026-06-17
**Branch:** `feat/ocr-category-suggestion`
**Status:** approved design → ready for implementation

## Context

When a receipt is scanned, OCR extracts merchant/date/total/currency/line-items
but **not** a category. The receipt review form (`receipt-review-form.tsx`)
therefore starts with an **empty** category and *requires* the user to pick one
before "Approve & add expense." On approve, `confirm()` creates the transaction
with the picked category **and enqueues a `categorize` job**, which re-derives a
category from the merchant/title (rules → LLM) and **can overwrite the user's
choice**.

This feature has the OCR vision model — which already sees the whole receipt
(merchant *and* line items, the richest available context) — **suggest a
`CategoryKey`**, pre-filled into the review form so the user confirms rather than
picks from scratch. It also makes the **reviewed category authoritative** by
removing the post-confirm re-categorization for receipt-confirmed transactions.

## Decisions locked during brainstorming

- **Source:** the OCR vision model infers the category (not a second
  rules/LLM pass on merchant text) — highest quality, no extra LLM call, no DB
  column (rides the existing `ocr` JSONB).
- **One category per receipt** (not per line item) — matches the one-receipt →
  one-expense model.
- **Reviewed category wins:** pre-fill from OCR; on approve, skip the
  `categorize` job for receipt-confirmed transactions so it can't overwrite the
  reviewed category. The `categorize` job stays intact for other flows
  (manual/import/recurring).
- **Expense-only constraint is out of scope:** the model picks from the full
  `CategoryKey` enum; `income`/`transfer` are nonsensical for a receipt but the
  user catches them at review. Constraining to expense-only is a later refinement.

## Changes, end to end

**1. `@spendlio/ai` (`packages/ai/src/provider.ts`, `offline/index.ts`, `live/index.ts`)**
- Add `category: CategoryKey.nullable()` to `ReceiptOcrResult`. It is `.nullable()`
  (NOT `.default()`/`.optional()`) so it stays **OpenAI-strict-output-safe** —
  the field is always present in the schema's `required` set, value may be `null`
  when the model is unsure. (`CategoryKey` is already imported in `provider.ts`.)
  The enum values are conveyed to the model automatically via the structured-output
  schema.
- Live provider (`extractReceipt`): extend the prompt to ask for the best-fit
  category from the allowed list (e.g. add "and the best-fit spending category"
  to the user text). No other call-site change — `ReceiptOcrResult.parse` already
  re-validates.
- Offline provider: add a `category` (e.g. `'groceries'`) to the mock result so
  `ReceiptOcrResult.parse(result)` keeps passing.

**2. `contracts` (`packages/contracts/src/receipt.ts`)**
- Add `category: CategoryKey.nullable().optional()` to `ReceiptSchema`. No new DB
  column — it lives in the `ocr` JSONB (same pattern as `lineItems`). `CategoryKey`
  is already imported in `receipt.ts`.

**3. `apps/api` (`receipts.service.ts`)**
- `toReceipt()` surfaces `category` from the `ocr` blob (alongside `lineItems`):
  `category: ocr?.category ?? null`.
- `confirm()` **removes** the `await enqueue('categorize', { transactionId: txn.id })`
  call (and its comment). The transaction is created with the user's reviewed
  category, which is now authoritative. `enqueue` stays imported (still used by
  `create()`).

**4. `apps/web`**
- `app/receipts/[id]/page.tsx`: pass `suggestedCategory={receipt.category ?? null}`
  to `ReceiptReviewForm`.
- `features/receipts/components/receipt-review-form.tsx`: add a
  `suggestedCategory?: string | null` prop and initialize the category state from
  it — `useState(suggestedCategory ?? '')`. Still required, still fully
  overridable before approve.

## Behavior / edges

- **Model abstains (`null`), offline provider, or no API key** → form starts
  empty and the user picks manually (today's behavior — graceful degradation).
- **Suggested category not in the option list:** `CategoryKey` ⊆ the seeded
  categories, so this should not happen; the `Select` simply shows no selection if
  it ever did.
- **Strict outputs:** `category: CategoryKey.nullable()` is required-but-nullable
  → compatible with OpenAI strict structured outputs (no repeat of the
  `quantity.default()` rejection just fixed).

## Testing

- `@spendlio/ai`: schema test — `ReceiptOcrResult` accepts a valid `CategoryKey`,
  accepts `null`, and rejects a non-`CategoryKey` value for `category`.
- `contracts`: `ReceiptSchema` round-trips `category` (value / null / absent).
- Offline provider: existing parse still passes with the added `category`.
- **Manual e2e:** scan a receipt → review form pre-selects the OCR category →
  approve → the expense keeps that category (confirm the `categorize` job no
  longer runs for receipt confirms, so it isn't overwritten).

## Out of scope

- Per-line-item categorization / receipt splitting.
- Constraining the OCR category to expense-only categories.
- Changing the `categorize` job's overwrite behavior for non-receipt flows.
