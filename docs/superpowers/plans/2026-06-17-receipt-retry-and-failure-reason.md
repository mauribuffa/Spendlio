# Receipt Retry + Failure-Reason Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user see a friendly reason why a receipt scan failed and retry it (re-run OCR on the same uploaded image) from both the receipts list and the receipt detail page.

**Architecture:** Denormalize a typed `failureReason` code onto the `receipts` row (worker classifies the raw error → code on the final failed attempt; raw error stays in `dead_letters`). The web maps code → friendly text. A new `POST /receipts/:id/retry` flips the receipt back to `processing` and re-enqueues OCR via a new `requeue()` queue helper that first removes the existing deterministic job (otherwise BullMQ dedupes the re-add into a no-op).

**Tech Stack:** TypeScript (strict), Zod (`@spendlio/contracts`), pure domain logic (`@spendlio/core`, Vitest), Drizzle + Postgres (`@spendlio/db`), BullMQ (`@spendlio/queue`), NestJS (`apps/api`), Next.js App Router + React server/client components (`apps/web`).

**Reference spec:** `docs/superpowers/specs/2026-06-17-receipt-retry-and-failure-reason-design.md`

**Branch:** `feat/receipt-retry-and-failure-reason` (already created; the design spec is already committed there).

**Reason codes:** `ReceiptFailureReason = 'timeout' | 'unreadable' | 'image_unavailable' | 'unknown'`

---

## Task 1: Contracts — `ReceiptFailureReason` enum + `failureReason` on `ReceiptSchema`

**Files:**
- Modify: `packages/contracts/src/enums.ts`
- Modify: `packages/contracts/src/receipt.ts:17-31`
- Test (create): `packages/contracts/src/receipt-failure-reason.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/contracts/src/receipt-failure-reason.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ReceiptSchema, ReceiptFailureReason } from './index';

const base = {
  id: '11111111-1111-1111-1111-111111111111',
  userId: '22222222-2222-2222-2222-222222222222',
  createdAt: '2026-06-17T00:00:00.000Z',
  updatedAt: '2026-06-17T00:00:00.000Z',
  imageKey: 'receipts/u/abc.jpg',
  status: 'failed' as const,
};

describe('ReceiptFailureReason', () => {
  it('accepts the four reason codes', () => {
    expect(ReceiptFailureReason.options).toEqual([
      'timeout',
      'unreadable',
      'image_unavailable',
      'unknown',
    ]);
  });
});

describe('ReceiptSchema.failureReason', () => {
  it('round-trips a failure reason code', () => {
    const r = ReceiptSchema.parse({ ...base, failureReason: 'unreadable' });
    expect(r.failureReason).toBe('unreadable');
    expect(r.lineItems).toEqual([]);
  });

  it('is optional (absent is fine)', () => {
    const r = ReceiptSchema.parse(base);
    expect(r.failureReason).toBeUndefined();
  });

  it('accepts null', () => {
    const r = ReceiptSchema.parse({ ...base, failureReason: null });
    expect(r.failureReason).toBeNull();
  });

  it('rejects an unknown code', () => {
    expect(() => ReceiptSchema.parse({ ...base, failureReason: 'banana' })).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @spendlio/contracts test -- src/receipt-failure-reason.test.ts`
Expected: FAIL — `ReceiptFailureReason` is not exported / `ReceiptSchema` strips the unknown `failureReason` key.

- [ ] **Step 3: Add the enum**

In `packages/contracts/src/enums.ts`, add directly after the `ReceiptStatus` block (after line 25):

```ts
export const ReceiptFailureReason = z.enum(['timeout','unreadable','image_unavailable','unknown']);
export type ReceiptFailureReason = z.infer<typeof ReceiptFailureReason>;
```

- [ ] **Step 4: Add the field to the schema**

In `packages/contracts/src/receipt.ts`, change the import on line 4 from:

```ts
import { ReceiptStatus, CategoryKey } from './enums';
```

to:

```ts
import { ReceiptStatus, ReceiptFailureReason, CategoryKey } from './enums';
```

Then add this line to `ReceiptSchema` immediately after the `status: ReceiptStatus,` line (line 21):

```ts
  failureReason: ReceiptFailureReason.nullable().optional(), // why a 'failed' scan failed (friendly text mapped at the web edge)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @spendlio/contracts test -- src/receipt-failure-reason.test.ts`
Expected: PASS (4 passing)

- [ ] **Step 6: Typecheck the package**

Run: `pnpm --filter @spendlio/contracts typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/contracts/src/enums.ts packages/contracts/src/receipt.ts packages/contracts/src/receipt-failure-reason.test.ts
git commit -m "feat(contracts): add ReceiptFailureReason + receipt.failureReason"
```

---

## Task 2: Core — `classifyOcrFailure(message)`

Pure, framework-free string → reason classifier. Lives in `core` (golden rule: the work lives in `core`; importing a *type* from `contracts` is allowed — deps point inward toward `contracts`).

**Files:**
- Create: `packages/core/src/ocr.ts`
- Test (create): `packages/core/src/ocr.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/ocr.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { classifyOcrFailure } from './ocr';

describe('classifyOcrFailure', () => {
  it('classifies timeouts', () => {
    expect(classifyOcrFailure('The operation timed out')).toBe('timeout');
    expect(classifyOcrFailure('signal timeout')).toBe('timeout');
    expect(classifyOcrFailure('The operation was aborted')).toBe('timeout');
  });

  it('prefers timeout over the wrapping "extraction failed" text', () => {
    // The live provider wraps every inner error as "receipt extraction failed: <inner>".
    expect(classifyOcrFailure('receipt extraction failed: signal timed out')).toBe('timeout');
  });

  it('classifies image-availability/integrity failures', () => {
    expect(
      classifyOcrFailure('receipt abc content hash mismatch (expected x, got y)'),
    ).toBe('image_unavailable');
    expect(classifyOcrFailure('NoSuchKey: The specified key does not exist')).toBe('image_unavailable');
  });

  it('classifies provider/parse failures as unreadable', () => {
    expect(classifyOcrFailure('receipt extraction failed: response did not match schema')).toBe('unreadable');
    expect(classifyOcrFailure('Invalid JSON returned by the model')).toBe('unreadable');
  });

  it('falls back to unknown', () => {
    expect(classifyOcrFailure('something totally weird happened')).toBe('unknown');
    expect(classifyOcrFailure('')).toBe('unknown');
    expect(classifyOcrFailure(undefined)).toBe('unknown');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @spendlio/core test -- src/ocr.test.ts`
Expected: FAIL — `classifyOcrFailure` is not defined.

- [ ] **Step 3: Write the implementation**

Create `packages/core/src/ocr.ts`:

```ts
import type { ReceiptFailureReason } from '@spendlio/contracts';

// Heuristic classification of an OCR worker error into a user-facing reason
// code. The raw message is still persisted to `dead_letters` for the developer;
// this only decides which friendly line the user sees. Order matters: a timeout
// also matches the provider's "extraction failed" wrapper, so check it first.
const TIMEOUT = /timeout|timed out|abort/i;
const IMAGE = /hash mismatch|no such key|nosuchkey|not found|could not (?:get|read|download)|getobject/i;
const UNREADABLE = /extraction failed|unreadable|parse|invalid|schema|did not match/i;

export function classifyOcrFailure(message: string | null | undefined): ReceiptFailureReason {
  const m = message ?? '';
  if (TIMEOUT.test(m)) return 'timeout';
  if (IMAGE.test(m)) return 'image_unavailable';
  if (UNREADABLE.test(m)) return 'unreadable';
  return 'unknown';
}
```

- [ ] **Step 4: Export it**

In `packages/core/src/index.ts`, add at the end:

```ts
export * from './ocr';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @spendlio/core test -- src/ocr.test.ts`
Expected: PASS (5 passing)

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @spendlio/core typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/ocr.ts packages/core/src/ocr.test.ts packages/core/src/index.ts
git commit -m "feat(core): classifyOcrFailure error->reason classifier"
```

---

## Task 3: DB — `failure_reason` column + migration

**Files:**
- Modify: `packages/db/src/schema/receipts.ts:9` (add column after `status`)
- Generate: `packages/db/drizzle/0005_*.sql` (drizzle-kit names it)

**Prerequisite for `db:migrate`:** Postgres running (`docker compose up -d`) and `DATABASE_URL` in the repo-root `.env` (drizzle.config.ts loads it).

- [ ] **Step 1: Add the column to the Drizzle schema**

In `packages/db/src/schema/receipts.ts`, add this line immediately after the `status` line (line 9):

```ts
  failureReason: varchar('failure_reason', { length: 32 }),     // why a 'failed' receipt failed; null otherwise (ReceiptFailureReason)
```

(`varchar` is already imported on line 1.)

- [ ] **Step 2: Generate the migration**

Run: `pnpm db:generate`
Expected: a new file `packages/db/drizzle/0005_<random>.sql` is created.

- [ ] **Step 3: Verify the generated SQL**

Run: `cat packages/db/drizzle/0005_*.sql`
Expected: contains exactly an add-column statement, e.g.:

```sql
ALTER TABLE "receipts" ADD COLUMN "failure_reason" varchar(32);
```

If it contains anything else (unexpected drops/renames), STOP and investigate — the schema diff picked up drift.

- [ ] **Step 4: Apply the migration**

Run: `pnpm db:migrate`
Expected: drizzle applies `0005_*` with no error. (Requires Postgres up — see prerequisite.)

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @spendlio/db typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/schema/receipts.ts packages/db/drizzle/
git commit -m "feat(db): add receipts.failure_reason column"
```

---

## Task 4: Queue — `requeue()` helper

Re-running an idempotent job: BullMQ dedupes by `jobId`, and `DEFAULT_JOB_OPTIONS.removeOnFail` keeps the failed job around, so a plain `enqueue('ocr', …)` after a failure is a silent no-op. `requeue` removes the stale job first, then enqueues fresh.

**Files:**
- Modify: `packages/queue/src/queues.ts` (add `requeue` after `enqueue`, ~line 107)
- Modify: `packages/queue/src/index.ts:5` (export `requeue`)

- [ ] **Step 1: Add the helper**

In `packages/queue/src/queues.ts`, add this function immediately after the `enqueue` function (after line 107, before `closeQueues`):

```ts
/**
 * Force a fresh run of an idempotent job. `enqueue` alone is a no-op when a job
 * with the same deterministic id already exists (BullMQ dedupes by jobId, and
 * DEFAULT_JOB_OPTIONS keeps failed jobs around) — so remove any existing job for
 * this payload's id first, then enqueue it again (attempt counter reset).
 */
export async function requeue<N extends QueueName>(name: N, payload: JobPayloadMap[N]) {
  const jobId = defaultJobId(name, payload);
  if (jobId) {
    const existing = await getQueue(name).getJob(jobId);
    if (existing) await existing.remove();
  }
  return enqueue(name, payload);
}
```

- [ ] **Step 2: Export it**

In `packages/queue/src/index.ts`, change the producer-surface export (line 5) from:

```ts
export { enqueue, getQueue, closeQueues, DEFAULT_JOB_OPTIONS, QUEUES, type QueueName } from './queues';
```

to:

```ts
export { enqueue, requeue, getQueue, closeQueues, DEFAULT_JOB_OPTIONS, QUEUES, type QueueName } from './queues';
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @spendlio/queue typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/queue/src/queues.ts packages/queue/src/index.ts
git commit -m "feat(queue): add requeue() to force a fresh run of a deduped job"
```

---

## Task 5: Worker — persist `failureReason` on the final failed attempt

**Files:**
- Modify: `apps/worker/src/processors/ocr.ts` (import core; success `set`; catch `set`)

- [ ] **Step 1: Import the classifier**

In `apps/worker/src/processors/ocr.ts`, add to the imports (after line 5, `import { getProvider } from '@spendlio/ai';`):

```ts
import { classifyOcrFailure } from '@spendlio/core';
```

- [ ] **Step 2: Clear the reason on success**

In the success `update().set({...})` block, add `failureReason: null` (the failed → retry → parsed path must clear the stale reason). Change the set object (lines 51-58) so it includes:

```ts
      .set({
        status: 'parsed',
        failureReason: null,
        merchant: result.merchant,
        total: result.total,
        currency: result.currency,
        purchasedAt: result.date ? new Date(result.date) : null,
        ocr: result, // full structured result (line items + confidence) as JSONB
        updatedAt: new Date(),
      })
```

- [ ] **Step 3: Store the reason on the final failed attempt**

In the `catch` block, change the final-attempt update (lines 68-72) from:

```ts
    if (isFinalAttempt) {
      await db
        .update(receipts)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(receipts.id, receiptId));
    }
```

to:

```ts
    if (isFinalAttempt) {
      await db
        .update(receipts)
        .set({
          status: 'failed',
          failureReason: classifyOcrFailure((err as Error)?.message),
          updatedAt: new Date(),
        })
        .where(eq(receipts.id, receiptId));
    }
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @spendlio/worker typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/worker/src/processors/ocr.ts
git commit -m "feat(worker): record receipt failureReason on final OCR failure"
```

---

## Task 6: API — `POST /receipts/:id/retry`

**Files:**
- Modify: `apps/api/src/receipts/receipts.service.ts` (import `requeue`; add `retry()`)
- Modify: `apps/api/src/receipts/receipts.controller.ts` (add the route)

- [ ] **Step 1: Import `requeue` in the service**

In `apps/api/src/receipts/receipts.service.ts`, change line 6 from:

```ts
import { enqueue } from '@spendlio/queue';
```

to:

```ts
import { enqueue, requeue } from '@spendlio/queue';
```

- [ ] **Step 2: Add the `retry` method**

In `apps/api/src/receipts/receipts.service.ts`, add this method immediately after `confirm(...)` (after line 114, before `imageUrl`):

```ts
  /**
   * Re-run OCR on a failed receipt's existing image. Flips it back to
   * 'processing' (clearing the stale reason) and re-enqueues the id-only job.
   * `requeue` removes the deduped failed job first, otherwise the re-enqueue
   * is a no-op. Rejects anything not currently 'failed'.
   */
  async retry(userId: string, id: string) {
    const [row] = await this.db.select().from(receipts)
      .where(and(eq(receipts.id, id), eq(receipts.userId, userId), isNull(receipts.deletedAt)));
    if (!row) throw new NotFoundException();
    if (row.status !== 'failed') {
      throw new BadRequestException("This receipt isn't in a failed state.");
    }

    await this.db.update(receipts)
      .set({ status: 'processing', failureReason: null, updatedAt: new Date() })
      .where(and(eq(receipts.id, id), eq(receipts.userId, userId)));

    await requeue('ocr', { receiptId: id });

    const [updated] = await this.db.select().from(receipts)
      .where(and(eq(receipts.id, id), eq(receipts.userId, userId)));
    return this.toReceipt(updated);
  }
```

- [ ] **Step 3: Add the controller route**

In `apps/api/src/receipts/receipts.controller.ts`, add this route immediately after the `confirm` handler (after line 44, before `@Get(':id')`):

```ts
  // Re-run OCR on a failed receipt → back to 'processing'.
  @Post(':id/retry')
  retry(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.svc.retry(u.id, id);
  }
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @spendlio/api typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/receipts/receipts.service.ts apps/api/src/receipts/receipts.controller.ts
git commit -m "feat(api): POST /receipts/:id/retry to re-run a failed scan"
```

---

## Task 7: Web — data layer, server action, friendly-text map

**Files:**
- Modify: `apps/web/lib/resources.ts` (add `retryReceipt`)
- Modify: `apps/web/features/receipts/lib/actions.ts` (add `retryReceiptAction`)
- Create: `apps/web/features/receipts/lib/failure-reason.ts`

- [ ] **Step 1: Add the resource**

In `apps/web/lib/resources.ts`, add immediately after `confirmReceipt` (after line 211):

```ts
/** Re-run OCR on a failed receipt → back to 'processing'. Returns the updated receipt. */
export function retryReceipt(id: string): Promise<Receipt> {
  return api.post(`/receipts/${id}/retry`, undefined, ReceiptSchema);
}
```

- [ ] **Step 2: Add the server action**

In `apps/web/features/receipts/lib/actions.ts`, change the resources import (line 5) from:

```ts
import { presignReceipt, registerReceipt, confirmReceipt, type PresignedUpload } from '@/lib/resources';
```

to:

```ts
import { presignReceipt, registerReceipt, confirmReceipt, retryReceipt, type PresignedUpload } from '@/lib/resources';
```

Then add at the end of the file:

```ts
export interface RetryResult {
  ok: boolean;
  error?: string;
}

/** Re-run OCR on a failed receipt. Revalidates the list + detail so the UI flips to 'processing'. */
export async function retryReceiptAction(id: string): Promise<RetryResult> {
  try {
    await retryReceipt(id);
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: 'Could not retry this scan.' };
  }
  revalidatePath(`/receipts/${id}`);
  revalidatePath('/receipts');
  return { ok: true };
}
```

- [ ] **Step 3: Add the friendly-text map**

Create `apps/web/features/receipts/lib/failure-reason.ts`:

```ts
import type { ReceiptFailureReason } from '@spendlio/contracts';

/** The user-facing line for a failed scan. `unknown`/null/undefined → the generic fallback. */
export function failureReasonText(reason: ReceiptFailureReason | null | undefined): string {
  switch (reason) {
    case 'timeout':
      return 'Reading this receipt took too long. Please try again.';
    case 'image_unavailable':
      return 'We couldn’t access this receipt’s image. Please upload it again.';
    case 'unreadable':
      return 'We couldn’t read this receipt. Retry, or scan a clearer, well-lit photo.';
    default:
      return 'Something went wrong while reading this receipt. Please try again.';
  }
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @spendlio/web typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/resources.ts apps/web/features/receipts/lib/actions.ts apps/web/features/receipts/lib/failure-reason.ts
git commit -m "feat(web): retryReceipt resource + action + failure-reason text map"
```

---

## Task 8: Web — `RetryReceiptButton` + wire into detail & list

**Files:**
- Create: `apps/web/features/receipts/components/retry-receipt-button.tsx`
- Modify: `apps/web/app/receipts/[id]/page.tsx` (failed banner + button; line-items text)
- Modify: `apps/web/app/receipts/page.tsx` (overlay-link row + retry on failed rows)

- [ ] **Step 1: Create the retry button (client component)**

Create `apps/web/features/receipts/components/retry-receipt-button.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@spendlio/ui';
import { retryReceiptAction } from '@/features/receipts/lib/actions';

/**
 * Retry a failed receipt scan. On success the receipt flips to 'processing' and
 * router.refresh() re-renders the server component, which re-arms PollWhileProcessing.
 */
export function RetryReceiptButton({ id, size = 'sm' }: { id: string; size?: 'sm' | 'md' }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onRetry() {
    setError(null);
    startTransition(async () => {
      const res = await retryReceiptAction(id);
      if (!res.ok) {
        setError(res.error ?? 'Could not retry this scan.');
        return;
      }
      router.refresh();
    });
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
      <Button type="button" variant="secondary" size={size} disabled={pending} onClick={onRetry}>
        {pending ? 'Retrying…' : 'Retry'}
      </Button>
      {error ? (
        <span style={{ color: 'var(--negative-500)', fontSize: 'var(--text-xs)' }}>{error}</span>
      ) : null}
    </span>
  );
}
```

- [ ] **Step 2: Detail page — import the button + text map**

In `apps/web/app/receipts/[id]/page.tsx`, add after the existing feature imports (after line 10, `import { ReceiptReviewForm } ...`):

```ts
import { RetryReceiptButton } from '@/features/receipts/components/retry-receipt-button';
import { failureReasonText } from '@/features/receipts/lib/failure-reason';
```

- [ ] **Step 3: Detail page — add the failed banner**

In `apps/web/app/receipts/[id]/page.tsx`, insert this block immediately after the closing `) : null}` of the image card (after line 64) and before the `{receipt.status === 'parsed' && !receipt.transactionId ? (` block:

```tsx
      {receipt.status === 'failed' ? (
        <Card padding="lg" style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', minWidth: 0 }}>
              <span style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--text-strong)' }}>
                Scan failed
              </span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                {failureReasonText(receipt.failureReason)}
              </span>
            </div>
            <RetryReceiptButton id={receipt.id} size="md" />
          </div>
        </Card>
      ) : null}
```

- [ ] **Step 4: Detail page — de-duplicate the line-items fallback text**

In the same file, the line-items fallback `Notice` (lines 150-156) repeats the failure advice. Change the `failed` branch text from:

```tsx
                : receipt.status === 'failed'
                  ? 'We couldn\'t read this receipt. Try scanning a clearer photo.'
                  : 'No line items were detected on this receipt.'}
```

to:

```tsx
                : receipt.status === 'failed'
                  ? 'No line items were read.'
                  : 'No line items were detected on this receipt.'}
```

- [ ] **Step 5: List page — import the button**

In `apps/web/app/receipts/page.tsx`, add after the existing receipts imports (after line 10, `import { PollWhileProcessing } ...`):

```ts
import { RetryReceiptButton } from '@/features/receipts/components/retry-receipt-button';
```

- [ ] **Step 6: List page — overlay-link row with retry on failed rows**

In `apps/web/app/receipts/page.tsx`, replace the entire `data.items.map(...)` block (lines 45-68 — the `<Link key={r.id} …> … </Link>`) with:

```tsx
          {data.items.map((r) => (
            <Card key={r.id} padding="md" style={{ position: 'relative' }}>
              {/* Whole-card click target. Sits under the content; the Retry button
                  re-enables pointer events so it isn't swallowed (no button-in-anchor). */}
              <Link
                href={`/receipts/${r.id}`}
                aria-label={`Open ${r.merchant ?? 'receipt'}`}
                style={{ position: 'absolute', inset: 0, borderRadius: 'var(--radius-md)' }}
              />
              <div style={{ position: 'relative', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', minWidth: 0 }}>
                  <span style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--text-strong)' }}>
                    {r.merchant ?? 'Receipt'}
                  </span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-subtle)' }}>
                    {r.purchasedAt
                      ? new Date(r.purchasedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  {r.total != null && r.currency ? (
                    <MoneyAmount amount={-Math.abs(r.total)} currency={r.currency} color="off" />
                  ) : null}
                  <StatusBadge status={r.status} />
                  {r.status === 'failed' ? (
                    <span style={{ pointerEvents: 'auto' }}>
                      <RetryReceiptButton id={r.id} />
                    </span>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
```

- [ ] **Step 7: Typecheck**

Run: `pnpm --filter @spendlio/web typecheck`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add apps/web/features/receipts/components/retry-receipt-button.tsx apps/web/app/receipts/[id]/page.tsx apps/web/app/receipts/page.tsx
git commit -m "feat(web): show failure reason + Retry on failed receipts (list + detail)"
```

---

## Task 9: ADR + end-to-end manual acceptance

**Files:**
- Modify: `docs/learning/decisions.md` (append ADR-034)

- [ ] **Step 1: Append the ADR**

Append a new ADR to `docs/learning/decisions.md` (next number is **ADR-034**; confirm with `grep -oE "ADR-0[0-9]+" docs/learning/decisions.md | sort -u | tail -1`). Match the file's existing ADR formatting. Content:

> **ADR-034 — Retry a failed receipt scan + surface a friendly failure reason.**
> Denormalize a typed `failure_reason` code onto the `receipts` row (worker classifies the raw error via `core.classifyOcrFailure` on the final failed attempt; raw error stays in `dead_letters`) rather than joining `dead_letters` on read — the receipt stays self-contained and cheap for list + detail, and `core` stays pure/testable. The web maps code → friendly text; raw errors are never shown. Retry goes through a new `queue.requeue()` that **removes the existing deterministic job before re-enqueuing**, because BullMQ dedupes by `jobId` and `removeOnFail` keeps the failed job, so a plain re-`enqueue` is a no-op. Retry re-runs OCR on the same image; re-uploading a new photo is out of scope.

- [ ] **Step 2: Full typecheck across the monorepo**

Run: `pnpm typecheck`
Expected: all packages pass.

- [ ] **Step 3: Manual acceptance — worker writes a reason on real failure**

Bring up infra and apps: `docker compose up -d` then `pnpm dev` (web + api) and start the worker (`pnpm --filter @spendlio/worker dev`).

Temporarily force OCR to throw: in `packages/ai/src/offline/index.ts`, make `extractReceipt` throw at the top (e.g. `throw new Error('response did not match schema');`). Scan a receipt in the web UI; wait for the 3 BullMQ attempts to exhaust (~a few seconds with backoff). Then verify in Postgres:

```bash
docker compose exec -T postgres psql -U postgres -d spendlio -c \
  "select id, status, failure_reason from receipts order by created_at desc limit 1;"
```

Expected: `status = failed`, `failure_reason = unreadable`. **Revert the offline-provider change** afterward.

- [ ] **Step 4: Manual acceptance — UI reason + retry (list & detail)**

With a failed receipt present (from Step 3, or set one manually:
`docker compose exec -T postgres psql -U postgres -d spendlio -c "update receipts set status='failed', failure_reason='unreadable' where id='<id>';"`):

1. **List** (`/receipts`): the failed row shows the red **Failed** badge and a **Retry** button; clicking elsewhere on the row still opens the detail page; clicking **Retry** does NOT navigate.
2. **Detail** (`/receipts/<id>`): a "Scan failed" card shows the friendly line ("We couldn’t read this receipt. Retry, or scan a clearer, well-lit photo.") with a **Retry** button.
3. Click **Retry** → the receipt flips to **Processing** and `PollWhileProcessing` starts refreshing. With the offline provider restored, it re-processes to **Parsed** within a few seconds.

- [ ] **Step 5: Commit the ADR**

```bash
git add docs/learning/decisions.md
git commit -m "docs(adr): ADR-034 receipt retry + failure reason"
```

---

## Self-review notes (verified against the spec)

- **Spec coverage:** reason enum + receipt field (Task 1); `classifyOcrFailure` + categories (Task 2); `failure_reason` column (Task 3); `requeue` no-op fix (Task 4); worker stores reason / clears on success (Task 5); `POST /receipts/:id/retry`, owner-scoped, `failed`-only (Task 6); web resource + action + text map (Task 7); detail banner + list retry + overlay-link HTML-validity fix (Task 8); ADR + manual acceptance (Task 9). All spec sections map to a task.
- **Type consistency:** `ReceiptFailureReason` codes `'timeout' | 'unreadable' | 'image_unavailable' | 'unknown'` are identical across contracts enum, core return type, worker write, and the web text map. `requeue(name, payload)` signature matches its call in the API service. `retryReceipt` → `retryReceiptAction` → `RetryReceiptButton` chain uses consistent names.
- **List HTML validity:** the retry control is a sibling of the overlay `<Link>`, never nested inside an anchor (pointer-events isolation), avoiding interactive-content-in-anchor.
