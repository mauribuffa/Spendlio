# Design spec — Retry a failed receipt scan + show the failure reason

**Date:** 2026-06-17
**Branch:** `feat/receipt-retry-and-failure-reason`
**Status:** approved design → ready for implementation

## Context

When a receipt scan fails, the user is stuck. The OCR worker already auto-retries
**3× with exponential backoff**; a receipt only reaches `status='failed'` after all
attempts are exhausted. At that point:

- The **reason** for the failure is captured, but only in the `dead_letters` ops
  table (keyed by BullMQ job id `ocr-<receiptId>`), which the web app never reads.
- The failed-receipt detail page shows a generic line — *"We couldn't read this
  receipt. Try scanning a clearer photo."* — with **no actual reason** and **no way
  to retry** short of re-uploading from scratch.
- A `redriveDeadLetter()` helper exists in the worker but is **not wired to any API
  endpoint**.

This feature lets the user **see a friendly failure reason** and **retry the scan**
(re-run OCR on the same uploaded image) from both the receipts list and the detail
page.

## Decisions locked during brainstorming

- **Friendly reason only.** The UI shows a human message mapped from a small reason
  code. The raw technical error stays in `dead_letters` (for the developer), never
  on the user-facing row.
- **Retry = re-run OCR on the same image.** Re-uploading a different/clearer photo
  is **out of scope** for this change.
- **Retry available on both** the detail page and on failed rows in the list.

## Approach

**Denormalize a typed reason code onto the receipt row.** Chosen over (B) joining
`dead_letters` at read time — it's keyed by job id, would make list reads N+1, and
couples the read path to an ops table — and over (C) storing the raw error string on
the receipt and classifying in the web, which pushes domain logic into the UI and
keeps raw text on the user-facing row (which we want hidden). Approach A keeps `core`
pure and testable, makes the receipt self-contained (cheap for list **and** detail),
and routes everything through `contracts`.

## Reason categories

`ReceiptFailureReason = timeout | unreadable | image_unavailable | unknown`

Classification of the real error sources (worker side, pure function in `core`):

| Error source | Code |
|---|---|
| `AbortSignal` / "timeout" / "timed out" (90s OCR cap) | `timeout` |
| content **hash mismatch**, storage `getObject` failure | `image_unavailable` |
| extraction failed, Zod parse error, provider error | `unreadable` |
| anything unmatched | `unknown` |

Friendly text (web edge, `code → string`):

- `timeout` — "Reading this receipt took too long. Please try again."
- `unreadable` — "We couldn't read this receipt. Retry, or scan a clearer, well-lit photo."
- `image_unavailable` — "We couldn't access this receipt's image. Please upload it again."
- `unknown` — "Something went wrong while reading this receipt. Please try again."

## Changes, end to end

**1. `packages/contracts`**
- Add `ReceiptFailureReason` enum (`enums.ts`): `['timeout','unreadable','image_unavailable','unknown']`.
- Add to `ReceiptSchema` (`receipt.ts`): `failureReason: ReceiptFailureReason.nullable().optional()`.

**2. `packages/core`**
- New pure `classifyOcrFailure(message: string): ReceiptFailureReason` with unit
  tests covering each category (timeout / hash mismatch / extraction / unknown).
- No framework, no DB, no React imports (golden rule 1).

**3. `packages/db`**
- New migration adding `failure_reason varchar(32)` (nullable) to `receipts`.
  Existing migrations are **never edited** (golden rule / conventions). Add the
  column to the Drizzle schema (`schema/receipts.ts`).

**4. `apps/worker` — OCR processor (`processors/ocr.ts`)**
- In the **final-attempt** failure branch, set
  `failureReason: classifyOcrFailure(err.message)` alongside `status: 'failed'`.
- On **success**, set `failureReason: null` defensively (covers the failed → retry →
  parsed path).
- `dead_letters` recording is **unchanged** — raw error still persisted there.

**5. `packages/queue` — `requeue(name, payload)` helper**
- The OCR job uses a **deterministic** id (`ocr-<receiptId>`). BullMQ **ignores** a
  re-add when a job with that id already exists, and `removeOnFail: { count: 5000 }`
  keeps the failed job around — so a naive re-`enqueue` would silently do nothing.
- `requeue` **removes the existing job** for that deterministic id (if present),
  then re-adds via the normal `enqueue` path. Keeps the one-job-per-receipt
  invariant and idempotency.

**6. `apps/api` — `POST /receipts/:id/retry`**
- Owner-scoped (`user_id`), not deleted.
- Require `status === 'failed'` → else `400` ("This receipt isn't in a failed state").
- Set `status='processing'`, `failureReason=null`, `updatedAt=now`.
- `requeue('ocr', { receiptId })`.
- Return the updated receipt (`ReceiptSchema`-shaped via `toReceipt`).

**7. `apps/web`**
- `lib/resources.ts`: `retryReceipt(id): Promise<Receipt>` → `POST /receipts/:id/retry`.
- `features/receipts/lib`: `retryReceiptAction` server action that calls
  `retryReceipt` and refreshes/revalidates.
- `features/receipts/lib` (or a small module): `failureReasonText(code)` map.
- **Detail page** (`app/receipts/[id]/page.tsx`): when `status === 'failed'`, render a
  failure `Notice` (negative/warn tone) with the friendly reason + a **Retry** button
  beside it. After retry, status flips to `processing` and the existing
  `PollWhileProcessing` resumes automatically.
- **List** (`app/receipts/page.tsx`): failed rows get a compact **Retry** control.
  Rows are `<Link><Card>…</Card></Link>`, so the retry button is a **client component**
  that `preventDefault`/`stopPropagation`s the navigation and runs the action in place.

## Behavior notes

- Because OCR already auto-retries 3× before `failed` ever shows, **manual retry
  mostly recovers transient failures** (provider down, timeout). Retrying the same
  unreadable image will likely fail again — the `unreadable` text nudges toward a
  clearer photo (re-upload is intentionally out of scope here).
- Retry is **idempotent-safe**: `requeue` removes any stale job first; the processor
  early-returns on `status==='parsed'`.

## Testing

- `core`: unit tests for `classifyOcrFailure` — one per category + fallback.
- `contracts`: `ReceiptSchema` accepts and round-trips `failureReason` (incl.
  `null`/absent).
- **Manual acceptance:** force an OCR failure (offline provider throw, or a corrupt
  image) → receipt shows `failed` + the friendly reason on list & detail → tap
  **Retry** → receipt returns to `processing` and re-runs OCR.

## ADR

Adding a denormalized `failure_reason` column + a retry endpoint is a non-trivial
decision; append a short ADR to `docs/learning/decisions.md` during implementation
(per project convention) recording approach A and the `requeue` remove-then-add
rationale.

## Out of scope

- Re-uploading a new/clearer image as part of "retry".
- Quick retry on non-failed states; bulk retry; retry rate-limiting/backoff caps.
- Replacing the console-only `alertFailure` (still a future swap point).
