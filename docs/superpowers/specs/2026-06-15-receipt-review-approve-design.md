# Design spec — Receipt review & approve → expense

**Date:** 2026-06-15
**Branch:** `feat/receipt-review-approve`
**Status:** approved design → ready for implementation

## Context

OCR is best-effort and especially fragile across locales — e.g. Argentine peso
(ARS) receipts print amounts as `1.500,00` (dot = thousands, comma = decimals),
the inverse of US formatting, so the model can emit the wrong scale ("wrong
quantity of zeros"). Rather than chase perfect parsing, **make OCR a suggestion
the user verifies and corrects before it becomes money.** Approving a parsed
receipt creates the linked expense transaction.

Today the receipt detail page (`/receipts/[id]`) shows OCR output read-only, and
there is **no** receipt→transaction path (the "create transaction from receipt"
action was intentionally omitted because no endpoint existed). This adds it.

## Flow

1. **Scan/upload** — unchanged (client SHA-256 → presign → PUT → register). After
   register, the web **routes to `/receipts/<id>`** (instead of only closing the
   Scan modal) so the user lands on the review screen.
2. **Detail page** polls while `processing` (existing `PollWhileProcessing`).
3. When the receipt is **`parsed` and not yet linked** (`transactionId == null`),
   the page renders an **editable review form** pre-filled from the OCR guess:
   merchant, date, total, currency, line items (add/remove/edit), plus a
   **category picker** (required — transactions need a category).
4. The total has an **"auto-sum from items"** affordance, but stays
   **user-overridable** — the total is authoritative for the expense.
5. **Approve** → `POST /receipts/:id/confirm` writes the corrected values back to
   the receipt **and** creates the linked expense, then the page shows a
   **"Converted to expense ✓"** panel.

## API

New **`POST /receipts/:id/confirm`**, body validated by `ConfirmReceiptInput`
(contracts):

```
ConfirmReceiptInput = {
  merchant?: string | null,
  occurredAt: Date,            // coerced
  total: number,               // integer MINOR units (web converts via toMinorUnits)
  currency: CurrencyCode,
  category: CategoryKey,
  lineItems: ReceiptLineItem[] // each amount also integer minor units
}
```

`ReceiptsService.confirm(userId, id, dto)`:
- Load the receipt scoped to `userId`, not deleted. Reject (400) if it is not yet
  `parsed`, or if it already has a `transactionId` ("already converted").
- **Update the receipt** with the corrected `merchant`, `total`, `currency`,
  `purchasedAt = occurredAt`, and overwrite `ocr.lineItems` with the corrected
  items (the row has no separate line-item columns; line items live in the `ocr`
  JSONB blob).
- **Create the transaction**: `{ userId, title: merchant ?? 'Receipt', amount:
  -Math.abs(total), currency, category, occurredAt, status: 'cleared', source:
  'ocr', receiptId: id }`.
- Set `receipt.transactionId = txn.id`. Return `{ receipt, transaction }`.

State model: **no enum change** — `transactionId != null` means "approved /
converted". The detail page shows the form when `parsed && !transactionId`, and a
"Converted ✓ → view expense" panel once linked.

## Money scaling (the ARS fix)

The review form takes **human major-unit input** (e.g. `1500`, `1.500`); the web
**server action converts to integer minor units via per-currency
`toMinorUnits(major, currency)`** (ARS = 2, JPY/CLP = 0, BHD = 3) before sending
`ConfirmReceiptInput`. This replaces the hardcoded `× 100` for this path, so a
corrected ARS value scales correctly. (The pre-existing hardcoded `× 100` in
`createTransactionAction` / `createExpenseAction` / `settleUpAction` is a
separate latent bug for non-2-decimal currencies — **noted as a follow-up**, not
fixed here, to keep scope tight.)

## Web components

- `lib/resources.ts`: `confirmReceipt(id, input)` → `POST /receipts/:id/confirm`.
- `receipts/actions.ts`: `confirmReceiptAction` — parses the form, converts each
  major amount via `toMinorUnits`, builds + validates `ConfirmReceiptInput`,
  calls `confirmReceipt`, revalidates `/receipts`, `/transactions`, `/`. Also
  `registerReceiptAction` now **returns the new receipt id** so the uploader can
  navigate.
- `receipts/UploadReceipt.tsx`: on success, `router.push('/receipts/<id>')` (and
  still closes the Scan modal via `onSuccess`).
- New client `receipts/ReceiptReviewForm.tsx`: editable merchant/date/total/
  currency, an editable line-item list (add/remove rows, `AmountInput` per row),
  an "auto-sum" button, a category `Select` (from `listCategories`), and an
  Approve button wired to `confirmReceiptAction`.
- `receipts/[id]/page.tsx`: render the review form when `parsed && !transactionId`;
  render a "Converted ✓" panel (link to `/transactions`) when linked; keep the
  image + read-only summary.

## Out of scope / follow-ups

- AI-suggested category pre-fill (manual pick for v1).
- Fixing the hardcoded `× 100` in the other manual-entry actions (separate).
- A per-transaction detail route (link to the `/transactions` list for now).
- No new receipt status enum value.

## Verification

- `pnpm -r typecheck`, contracts/storage tests, `pnpm --filter web build` green.
- Live: scan → land on detail → edit total/line items + pick category → approve →
  expense created with the corrected (per-currency-scaled) amount and linked;
  re-confirm rejected (already converted). Spot-check an ARS amount scales right.
