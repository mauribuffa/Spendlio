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
