# Receipts Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the web-only Receipts / scan (OCR) feature (Slice B). The backend is already complete (presign, register, list, get, delete + OCR worker). This plan adds: (1) the web data-layer functions in `apps/web/lib/resources.ts`, (2) a `/receipts` page listing receipts as Cards with a status Badge, (3) a client-side upload affordance that does presign → browser `PUT` → register, (4) a `/receipts/[id]` detail page showing parsed merchant / total / line items, (5) a "Receipts" nav entry in `AppShell`. Status updates surface via revalidation-based polling.

**Architecture:** The web app reads in **server components** and writes in **server actions**, both going through `apps/web/lib/resources.ts` → `apps/web/lib/api.ts`, which is `server-only` and attaches the dev `x-user-id` header. The browser never sees that header. The **only** client-side network call is the raw image `PUT` to the MinIO/S3 presigned URL — that URL is short-lived and carries no Spendlio credentials, so it is safe to expose to the browser. Reads parse the API response against the `@spendlio/contracts` Zod schema so API/contract drift fails loudly. Money is integer minor units everywhere; it is formatted only at the UI edge via `@spendlio/ui`'s `MoneyAmount`.

**Tech Stack:** Next.js (App Router, React 19, server components + server actions), TypeScript (strict), Zod (`@spendlio/contracts`), `@spendlio/ui` (Card, Badge, Button, EmptyState, Skeleton, IconButton, MoneyAmount), lucide-react, Vitest for the pure upload helper.

---

## Context the worker must know

**Backend shapes (read from `apps/api/src/receipts/receipts.controller.ts` + `receipts.service.ts`, and `packages/storage/src/blob-store.ts`):**

- `GET /receipts` → `{ items: Receipt[], nextCursor: null }` (a `Page(ReceiptSchema)`).
- `POST /receipts/presign?contentType=<mime>` → `PresignedUpload`:
  ```ts
  { url: string; method: 'PUT'; key: string; expiresIn: number }
  ```
  `contentType` is a **query param**, not a JSON body. The service derives the file extension from it (`image/jpeg` → `jpeg`), so always pass the real MIME type.
- `POST /receipts` with body `{ imageKey: string }` (`CreateReceiptInput`) → the created `Receipt` row (status `'processing'`, enqueues the `ocr` job).
- `GET /receipts/:id` → a single `Receipt`.
- `DELETE /receipts/:id` → `{ ok: true }` (not used by this slice; do not add a UI for it).

**Contract (`packages/contracts/src/receipt.ts`):**
```ts
ReceiptSchema = { ...ownedEntity, imageKey, status: 'processing'|'parsed'|'failed',
  merchant?: string|null, total?: number|null /* minor units */, currency?: CurrencyCode|null,
  purchasedAt?: Date|null, lineItems: ReceiptLineItem[] /* default [] */,
  raw?: unknown, transactionId?: string|null, deletedAt?: Date|null }
ReceiptLineItem = { description: string, quantity: number /* int, default 1 */, amount: number /* int minor units */ }
CreateReceiptInput = { imageKey: string }
```
`ReceiptSchema`, `ReceiptLineItem`, `CreateReceiptInput`, `ReceiptStatus`, and `Page` are all exported from `@spendlio/contracts`.

**No "create transaction from receipt" endpoint exists.** The `transactionId` field is on `ReceiptSchema`, but the receipts controller exposes no route to set it (no link/convert endpoint), and there is no `POST /receipts/:id/transaction` or equivalent. **Therefore this plan OMITS the "create transaction from receipt" action** and surfaces a short note in the detail page instead (see Task 5). Do not invent the endpoint.

**Patterns to mirror exactly:**
- Data layer: `apps/web/lib/resources.ts` — one typed function per endpoint, reads pass the schema to `api.get`/`api.post`.
- Page: `apps/web/app/transactions/page.tsx` — `async` server component, `safe(() => listX(), fallback)`, `<PageHeader>`, `<Notice tone="warn">` on error.
- Server action: `apps/web/app/transactions/actions.ts` — `'use server'`, returns `ActionResult`, `revalidatePath(...)` after success, `ApiError` handling.
- Client form: `apps/web/app/transactions/AddTransactionForm.tsx` — `'use client'`, design-token inline styles.

**Commands:** `pnpm --filter web typecheck`, `pnpm --filter @spendlio/contracts test` (the upload helper test lives in web; web has no vitest config, so the helper is tested by typecheck + the page smoke — see Task 2 note).

---

## Task 1: Data layer — receipts resource functions

**Files:**
- Modify: `apps/web/lib/resources.ts`

- [ ] **Step 1: Add the receipt imports to the existing `@spendlio/contracts` import block**

In `apps/web/lib/resources.ts`, extend the destructured import from `@spendlio/contracts` (the block that currently ends with `UserSchema, type User,`) by adding:
```ts
  ReceiptSchema,
  type Receipt,
  type CreateReceiptInput,
```

- [ ] **Step 2: Add a local `PresignedUpload` schema + the four resource functions**

Append a new section to `apps/web/lib/resources.ts`, after the `// ---- Current user (settings) ----` block and before the trailing `export type { ... }`:

```ts
// ---- Receipts (OCR) ----
const ReceiptPage = Page(ReceiptSchema);

// The presign response shape mirrors @spendlio/storage's PresignedUpload. We
// validate it here so a drift between storage + the web edge fails loudly.
const PresignedUpload = z.object({
  url: z.string().url(),
  method: z.literal('PUT'),
  key: z.string().min(1),
  expiresIn: z.number().int().positive(),
});
export type PresignedUpload = z.infer<typeof PresignedUpload>;

export function listReceipts(): Promise<z.infer<typeof ReceiptPage>> {
  return api.get(`/receipts`, ReceiptPage);
}

export function getReceipt(id: string): Promise<Receipt> {
  return api.get(`/receipts/${id}`, ReceiptSchema);
}

/** Step 1 of upload: ask the API for a short-lived PUT url for this MIME type. */
export function presignReceipt(contentType: string): Promise<PresignedUpload> {
  return api.post(`/receipts/presign?contentType=${encodeURIComponent(contentType)}`, undefined, PresignedUpload);
}

/** Step 3 of upload: register the uploaded object key → creates the row + enqueues OCR. */
export function registerReceipt(input: CreateReceiptInput): Promise<Receipt> {
  return api.post(`/receipts`, input, ReceiptSchema);
}
```

> `Page` is already imported at the top of the file. `api.post` already accepts `(path, body, schema)`; passing `undefined` as the body sends an empty POST (the presign route reads only the query param). `z` is already imported.

- [ ] **Step 3: Re-export the receipt types from the trailing `export type { ... }` block**

Add `Receipt,` to the existing `export type { ... }` list at the bottom of the file (alongside `Transaction, Budget, …, User`).

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: 0 errors. (`listReceipts`/`getReceipt`/`presignReceipt`/`registerReceipt` resolve; `PresignedUpload`/`Receipt`/`CreateReceiptInput` resolve from `@spendlio/contracts`.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/resources.ts
git commit -m "feat(web): receipts data layer (list/get/presign/register)"
```

---

## Task 2: Upload helper (pure, browser-side `PUT`) + its test

The presign + register calls are server-side (Task 3's server action). The single browser-side step is the raw `PUT`. Extract it into a tiny pure helper so it is unit-testable without a running stack.

**Files:**
- Create: `apps/web/lib/uploadToPresignedUrl.ts`
- Create: `apps/web/lib/uploadToPresignedUrl.test.ts`

> **Test runner note:** `apps/web` has no vitest config of its own. Add a minimal one (Step 1) so this helper can be tested in isolation; the helper is pure (uses the global `fetch`) and needs no jsdom. If the worker finds adding a web vitest config out of scope, fall back to: skip Steps 1–4's test, implement the helper (Step 5), and rely on `pnpm --filter web typecheck` + the manual smoke in Task 6. Prefer the tested path.

- [ ] **Step 1: Add a vitest config for the web app**

Create `apps/web/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});
```
Add a `test` script to `apps/web/package.json` `scripts` if absent: `"test": "vitest run"`.

- [ ] **Step 2: Write the failing test**

`apps/web/lib/uploadToPresignedUrl.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { uploadToPresignedUrl } from './uploadToPresignedUrl';

afterEach(() => vi.restoreAllMocks());

describe('uploadToPresignedUrl', () => {
  it('PUTs the file body with its content-type to the presigned url', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response);
    vi.stubGlobal('fetch', fetchMock);
    const file = new File([new Uint8Array([1, 2, 3])], 'r.jpg', { type: 'image/jpeg' });

    await uploadToPresignedUrl('https://blob.example/r.jpg?sig=abc', file);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://blob.example/r.jpg?sig=abc');
    expect(init.method).toBe('PUT');
    expect(init.body).toBe(file);
    expect(init.headers['content-type']).toBe('image/jpeg');
  });

  it('throws a clear error when the storage PUT fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 } as Response));
    const file = new File([new Uint8Array([1])], 'r.jpg', { type: 'image/jpeg' });

    await expect(uploadToPresignedUrl('https://blob.example/r.jpg', file)).rejects.toThrow(/upload failed \(403\)/i);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter web test -- uploadToPresignedUrl`
Expected: FAIL — cannot resolve `./uploadToPresignedUrl`.

- [ ] **Step 4: (covered by Step 5 implementation, then re-run)**

- [ ] **Step 5: Implement the helper**

`apps/web/lib/uploadToPresignedUrl.ts`:
```ts
/**
 * Upload a file's bytes directly to a presigned storage URL from the browser.
 *
 * This is the ONE network call the receipts flow makes client-side: the bytes
 * go straight to MinIO/S3 and never pass through our API. The URL is short-lived
 * and carries no Spendlio auth, so exposing it to the browser is safe. presign
 * (get the URL) and register (record the key) both stay on the server so the
 * `x-user-id` header is never shipped to the client.
 */
export async function uploadToPresignedUrl(url: string, file: File): Promise<void> {
  const res = await fetch(url, {
    method: 'PUT',
    body: file,
    headers: { 'content-type': file.type || 'application/octet-stream' },
  });
  if (!res.ok) {
    throw new Error(`Receipt upload failed (${res.status}). Try again.`);
  }
}
```

- [ ] **Step 6: Run the test (PASS) + typecheck**

Run: `pnpm --filter web test -- uploadToPresignedUrl && pnpm --filter web typecheck`
Expected: both tests PASS; typecheck 0.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/uploadToPresignedUrl.ts apps/web/lib/uploadToPresignedUrl.test.ts apps/web/vitest.config.ts apps/web/package.json
git commit -m "feat(web): browser PUT helper for presigned receipt upload"
```

---

## Task 3: Server actions — presign + register + revalidate

**Files:**
- Create: `apps/web/app/receipts/actions.ts`

The upload is a three-step dance split across the client/server boundary, mirroring how `AddTransactionForm` + `actions.ts` split work:
1. **Client** (Task 4) reads the chosen `File`, calls `presignAction(contentType)` (server) to get a `{ url, key }`.
2. **Client** `PUT`s the bytes to `url` via `uploadToPresignedUrl` (Task 2).
3. **Client** calls `registerReceiptAction(key)` (server), which creates the row + enqueues OCR, then revalidates `/receipts`.

- [ ] **Step 1: Implement the server actions**

`apps/web/app/receipts/actions.ts`:
```ts
'use server';

import { revalidatePath } from 'next/cache';
import { CreateReceiptInput } from '@spendlio/contracts';
import { presignReceipt, registerReceipt, type PresignedUpload } from '../../lib/resources';
import { ApiError } from '../../lib/api';

export interface PresignResult {
  ok: boolean;
  error?: string;
  presigned?: PresignedUpload;
}

export interface RegisterResult {
  ok: boolean;
  error?: string;
}

/** Step 1: ask the API for a presigned PUT url for the given MIME type. */
export async function presignAction(contentType: string): Promise<PresignResult> {
  try {
    const presigned = await presignReceipt(contentType);
    return { ok: true, presigned };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: 'Could not start the upload.' };
  }
}

/** Step 3: register the uploaded object key → create the row + enqueue OCR. */
export async function registerReceiptAction(imageKey: string): Promise<RegisterResult> {
  const input = CreateReceiptInput.safeParse({ imageKey });
  if (!input.success) {
    return { ok: false, error: 'Invalid upload key.' };
  }
  try {
    await registerReceipt(input.data);
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: 'Could not save the receipt.' };
  }
  revalidatePath('/receipts');
  return { ok: true };
}
```

> `presignReceipt`/`registerReceipt` are `server-only`; calling them from a `'use server'` action keeps `x-user-id` on the server. The presigned `url` returned to the client is the only thing the browser touches.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/receipts/actions.ts
git commit -m "feat(web): receipt presign + register server actions"
```

---

## Task 4: Upload affordance (client component)

**Files:**
- Create: `apps/web/app/receipts/UploadReceipt.tsx`

A "Scan receipt" button that opens a hidden file input, runs the presign → PUT → register dance, shows progress/errors inline, then refreshes the route so the new (processing) receipt appears.

- [ ] **Step 1: Implement the client component**

`apps/web/app/receipts/UploadReceipt.tsx`:
```tsx
'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@spendlio/ui';
import { uploadToPresignedUrl } from '../../lib/uploadToPresignedUrl';
import { presignAction, registerReceiptAction } from './actions';

/**
 * Scan-receipt control. Three steps, the middle one client-side:
 *   1. presignAction(file.type)  — server (x-user-id stays server-side)
 *   2. PUT bytes to the presigned URL — browser (no Spendlio creds on this URL)
 *   3. registerReceiptAction(key) — server (creates row + enqueues OCR + revalidates)
 * Then router.refresh() pulls the freshly-revalidated server list.
 */
export function UploadReceipt() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);

    const presign = await presignAction(file.type || 'image/jpeg');
    if (!presign.ok || !presign.presigned) {
      setError(presign.error ?? 'Could not start the upload.');
      return;
    }

    try {
      await uploadToPresignedUrl(presign.presigned.url, file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
      return;
    }

    const registered = await registerReceiptAction(presign.presigned.key);
    if (!registered.ok) {
      setError(registered.error ?? 'Could not save the receipt.');
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ''; // allow re-selecting the same file
          if (file) void handleFile(file);
        }}
      />
      <Button type="button" disabled={pending} onClick={() => inputRef.current?.click()}>
        {pending ? 'Uploading…' : 'Scan receipt'}
      </Button>
      {error ? (
        <p style={{ color: 'var(--negative-500)', fontSize: 'var(--text-xs)', margin: 0 }}>{error}</p>
      ) : null}
    </div>
  );
}
```

> `accept="image/*"` keeps the MIME type aligned with the API's extension derivation. We clear `e.target.value` so the same file can be re-picked. `router.refresh()` re-runs the server component with the just-revalidated cache.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/receipts/UploadReceipt.tsx
git commit -m "feat(web): scan-receipt upload affordance"
```

---

## Task 5: Pages — list (`/receipts`) + detail (`/receipts/[id]`) + status polling

**Files:**
- Create: `apps/web/app/receipts/page.tsx`
- Create: `apps/web/app/receipts/StatusBadge.tsx`
- Create: `apps/web/app/receipts/[id]/page.tsx`

**Status polling approach (concrete):** the OCR worker flips a receipt from `processing` to `parsed`/`failed` asynchronously. The list page is a server component that reads fresh data on every request (`api.ts` uses `cache: 'no-store'`). To make the list self-update while any receipt is still `processing`, the list page sets `export const revalidate = 0` and renders a tiny client poller (`PollWhileProcessing`) that calls `router.refresh()` every few seconds **only while** at least one receipt is `processing`. When everything is `parsed`/`failed`, polling stops. The detail page uses the same poller scoped to its single receipt. This reuses the existing server-read data path (no new client fetch of receipt data, so `x-user-id` stays server-side) — the client only triggers a server re-render.

- [ ] **Step 1: A shared status → Badge mapping component**

`apps/web/app/receipts/StatusBadge.tsx`:
```tsx
import { Badge } from '@spendlio/ui';
import type { ReceiptStatus } from '@spendlio/contracts';

const TONE: Record<ReceiptStatus, { tone: 'accent' | 'positive' | 'negative'; label: string }> = {
  processing: { tone: 'accent', label: 'Processing' },
  parsed: { tone: 'positive', label: 'Parsed' },
  failed: { tone: 'negative', label: 'Failed' },
};

export function StatusBadge({ status }: { status: ReceiptStatus }) {
  const { tone, label } = TONE[status];
  return <Badge tone={tone}>{label}</Badge>;
}
```

- [ ] **Step 2: A client poller that refreshes while any receipt is processing**

Add to `apps/web/app/receipts/StatusBadge.tsx` is wrong — create the poller as part of the page file is also fine, but keep it a separate client file. Create `apps/web/app/receipts/PollWhileProcessing.tsx`:
```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * While `active` (any receipt still 'processing'), refresh the route every
 * `intervalMs` so the server component re-reads and the status Badge updates
 * once the OCR worker finishes. No client data fetch — just a server re-render.
 */
export function PollWhileProcessing({ active, intervalMs = 4000 }: { active: boolean; intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs, router]);
  return null;
}
```

> Add this file to the Task 5 commit. (The Step-2 prose note about StatusBadge was a guard against putting two components in one file — keep them separate.)

- [ ] **Step 3: The list page**

`apps/web/app/receipts/page.tsx`:
```tsx
import Link from 'next/link';
import { ReceiptText } from 'lucide-react';
import { Card, EmptyState, MoneyAmount } from '@spendlio/ui';
import { listReceipts, type Receipt } from '../../lib/resources';
import { safe } from '../../lib/safe';
import { PageHeader } from '../_components/PageHeader';
import { Notice } from '../_components/Notice';
import { UploadReceipt } from './UploadReceipt';
import { StatusBadge } from './StatusBadge';
import { PollWhileProcessing } from './PollWhileProcessing';

export const revalidate = 0;

export default async function ReceiptsPage() {
  const { data, error } = await safe(
    () => listReceipts(),
    { items: [] as Receipt[], nextCursor: null },
  );

  const anyProcessing = data.items.some((r) => r.status === 'processing');

  return (
    <div>
      <PageHeader eyebrow="Scan" title="Receipts" action={<UploadReceipt />} />

      {error ? (
        <Notice tone="warn">
          The API is not reachable yet, so this list is empty. Start the API (apps/api), the worker
          (apps/worker) and MinIO, then scan a receipt to see it here.
        </Notice>
      ) : null}

      <PollWhileProcessing active={anyProcessing} />

      {data.items.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<ReceiptText />}
            title="No receipts yet"
            message="Scan a receipt and we’ll pull out the merchant, total and line items for you."
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {data.items.map((r) => (
            <Link key={r.id} href={`/receipts/${r.id}`} style={{ display: 'block' }}>
              <Card padding="md">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', minWidth: 0 }}>
                    <span style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-ink)' }}>
                      {r.merchant ?? 'Receipt'}
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)' }}>
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
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

> `total` is OCR-parsed minor units; receipts are spend, so display it as a negative magnitude via `MoneyAmount` with `color="off"` (neutral). `createdAt` comes from `ownedEntity`. `Card`'s `padding` prop values (`sm|md|lg`) match the existing usage in `transactions/page.tsx`.

- [ ] **Step 4: The detail page**

`apps/web/app/receipts/[id]/page.tsx`:
```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, MoneyAmount } from '@spendlio/ui';
import { getReceipt } from '../../../lib/resources';
import { ApiError } from '../../../lib/api';
import { safe } from '../../../lib/safe';
import { PageHeader } from '../../_components/PageHeader';
import { Notice } from '../../_components/Notice';
import { StatusBadge } from '../StatusBadge';
import { PollWhileProcessing } from '../PollWhileProcessing';

export const revalidate = 0;

export default async function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: receipt, error } = await safe(() => getReceipt(id), null);

  // A 404 from the API (wrong/deleted id) is a real not-found, not an outage.
  if (!receipt && error?.includes('(404)')) notFound();

  if (!receipt) {
    return (
      <div>
        <PageHeader eyebrow="Receipt" title="Receipt" />
        <Notice tone="warn">
          Could not load this receipt — start the API (apps/api) and try again.
        </Notice>
        <Link href="/receipts" style={{ color: 'var(--color-primary-ink)', fontSize: 'var(--text-sm)' }}>
          ← Back to receipts
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Receipt"
        title={receipt.merchant ?? 'Receipt'}
        action={<StatusBadge status={receipt.status} />}
      />

      <PollWhileProcessing active={receipt.status === 'processing'} />

      <Link
        href="/receipts"
        style={{ display: 'inline-block', color: 'var(--color-primary-ink)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}
      >
        ← Back to receipts
      </Link>

      <Card padding="lg" style={{ marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)' }}>
              {receipt.merchant ?? 'Merchant pending'}
            </span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)' }}>
              {receipt.purchasedAt
                ? new Date(receipt.purchasedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Date pending'}
            </span>
          </div>
          {receipt.total != null && receipt.currency ? (
            <MoneyAmount amount={-Math.abs(receipt.total)} currency={receipt.currency} size="xl" color="off" />
          ) : (
            <span style={{ color: 'var(--color-ink-subtle)' }}>
              {receipt.status === 'processing' ? 'Reading total…' : 'No total found'}
            </span>
          )}
        </div>
      </Card>

      {receipt.lineItems.length > 0 ? (
        <Card padding="sm">
          <div style={{ display: 'grid', gap: '2px' }}>
            {receipt.lineItems.map((li, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  padding: 'var(--space-3) var(--space-4)',
                }}
              >
                <span style={{ color: 'var(--color-ink)' }}>
                  {li.quantity > 1 ? `${li.quantity}× ` : ''}{li.description}
                </span>
                {receipt.currency ? (
                  <MoneyAmount amount={-Math.abs(li.amount)} currency={receipt.currency} size="sm" color="off" />
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Notice tone="info">
          {receipt.status === 'processing'
            ? 'Still reading the receipt — line items will appear here once OCR finishes.'
            : receipt.status === 'failed'
              ? 'We couldn’t read this receipt. Try scanning a clearer photo.'
              : 'No line items were detected on this receipt.'}
        </Notice>
      )}

      {/*
        Note: there is no backend route to create a transaction from a receipt
        (the receipts controller exposes no link/convert endpoint, and nothing
        sets ReceiptSchema.transactionId). The "create transaction from receipt"
        action is intentionally omitted until that endpoint exists.
      */}
    </div>
  );
}
```

> `params` is a Promise in this Next.js version (App Router) — `await params`. `safe(..., null)` lets a real 404 surface as `notFound()` while an outage degrades to the Notice. `Notice` supports `tone="info" | "warn"`.

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: 0 errors.

- [ ] **Step 6: Manual smoke (note for the executor)**

With the full stack up (`pnpm dev` / mprocs: web + api + worker + Docker MinIO/Redis/Postgres):
- Visit `/receipts` → EmptyState renders when there are none.
- Click "Scan receipt", pick an image → a card appears with a "Processing" badge; within a few seconds the poller refreshes and it flips to "Parsed" (merchant/total populated) or "Failed".
- Click a card → detail page shows merchant, total, and line items (or the appropriate pending/failed Notice).
- Stop the API → both pages degrade to the warn Notice, not a crash.
- Confirm in the browser devtools Network tab that the only browser-side request to storage is the `PUT` to the presigned URL; presign + register go to the Next server (no `x-user-id` visible client-side).

> If the browser `PUT` is blocked by CORS, fix MinIO/S3 CORS to allow `PUT` from the web origin (flagged as a risk in the design spec). This is infra config, not code.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/receipts/page.tsx apps/web/app/receipts/StatusBadge.tsx apps/web/app/receipts/PollWhileProcessing.tsx "apps/web/app/receipts/[id]/page.tsx"
git commit -m "feat(web): receipts list + detail pages with status polling"
```

---

## Task 6: Nav — add "Receipts" to AppShell

**Files:**
- Modify: `apps/web/app/_components/AppShell.tsx`

- [ ] **Step 1: Add the lucide icon import**

In `apps/web/app/_components/AppShell.tsx`, add `ReceiptText` to the existing `lucide-react` import block:
```ts
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Users,
  Sparkles,
  Settings,
  ReceiptText,
} from 'lucide-react';
```

- [ ] **Step 2: Add the nav entry**

In the `NAV` array, add the Receipts link after Transactions (where it reads naturally in the activity group):
```ts
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/receipts', label: 'Receipts', icon: ReceiptText },
```

> `isActive` already prefix-matches non-`/` routes, so `/receipts/<id>` keeps the nav item active. No other change needed.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/_components/AppShell.tsx
git commit -m "feat(web): add Receipts nav entry"
```

---

## Task 7: Final verification + PROGRESS

- [ ] **Step 1: Full web typecheck + helper test**

Run:
```bash
pnpm --filter web typecheck
pnpm --filter web test -- uploadToPresignedUrl
```
Expected: typecheck 0; helper test PASS.

- [ ] **Step 2: Update PROGRESS.md** — tick the Receipts page / Slice B row, set status + date, add a Build-Log entry (per CLAUDE.md "How to work").

- [ ] **Step 3: Commit**

```bash
git add PROGRESS.md
git commit -m "chore(web): receipts page (Slice B) complete"
```

---

## Self-review notes

- **Golden rules honored:** all reads parse against `ReceiptSchema`/`Page` and the presign response against a local `PresignedUpload` Zod schema; `x-user-id` never leaves the server (presign + register are `server-only` via `resources.ts`, the only browser call is the credential-free `PUT`); money stays integer minor units and is formatted only at the UI edge via `MoneyAmount`.
- **No invented backend:** confirmed the receipts controller has **no** "create transaction from receipt" route, so that action is omitted and documented inline in the detail page.
- **Exact shapes matched:** `presign` takes `contentType` as a **query param** (not body); `register` posts `{ imageKey }`; list returns a `Page` `{ items, nextCursor }`.
- **Patterns matched:** page = async server component + `safe()` + `PageHeader`/`Notice`; actions = `'use server'` returning a result object + `revalidatePath`; client component for the only interactive/browser-side step — mirroring transactions.
- **Polling is server-driven:** `revalidate = 0` + a client `router.refresh()` loop that runs only while something is `processing`, so no client-side data fetch and no busy-loop once OCR settles.
- **Components used** are all from the approved set (Card, Badge, Button, EmptyState, Skeleton[available, not needed here since server-render is synchronous], IconButton[available, not needed], MoneyAmount).
- **One judgment call flagged:** Task 2 adds a small `apps/web/vitest.config.ts` so the pure upload helper is unit-testable (web currently has no test runner); a no-test fallback is documented if the executor deems it out of scope.
