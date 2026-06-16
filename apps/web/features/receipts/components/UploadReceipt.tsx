'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@spendlio/ui';
import { uploadToPresignedUrl } from '@/features/receipts/lib/uploadToPresignedUrl';
import { sha256Hex } from '@/features/receipts/lib/sha256';
import { presignAction, registerReceiptAction } from '@/features/receipts/lib/actions';

/** Apple HEIC/HEIF — the default iPhone camera format. */
function isHeic(file: File): boolean {
  return /heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

/**
 * Decode a HEIC/HEIF photo to a JPEG File. Browsers can't natively decode HEIC,
 * so this uses heic2any (libheif compiled to WASM), lazy-imported only when a
 * HEIC file is actually picked so the ~MB decoder never enters the main bundle.
 * Needed because OCR (OpenAI vision) only accepts PNG/JPEG/WEBP/GIF and most
 * browsers can't render HEIC for the preview.
 */
async function heicToJpeg(file: File): Promise<File> {
  const { default: heic2any } = await import('heic2any');
  const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
  const blob = Array.isArray(out) ? out[0]! : out;
  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], name, { type: 'image/jpeg' });
}

/**
 * Scan-receipt control. The first steps are client-side:
 *   0. convert HEIC → JPEG if needed (browser; OCR + preview can't handle HEIC)
 *   1. sha256Hex(file) — browser (content hash; bytes never hit our API)
 *   2. presignAction(type, hash) — server (content-addressed key)
 *   3. PUT bytes to the presigned URL — browser (no Spendlio creds on this URL)
 *   4. registerReceiptAction(key, hash) — server (row + OCR, deduped on the hash)
 * Then route to the receipt's review screen.
 */
export function UploadReceipt({ onSuccess }: { onSuccess?: () => void } = {}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null); // null = idle, else a label
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setBusy(isHeic(file) ? 'Converting…' : 'Uploading…');
    try {
      // HEIC (iPhone) → JPEG so OCR can read it and the preview can render it.
      let upload = file;
      if (isHeic(file)) {
        try {
          upload = await heicToJpeg(file);
        } catch {
          setError('Could not convert this HEIC photo — try a JPEG or PNG.');
          return;
        }
        setBusy('Uploading…');
      }

      let hash: string;
      try {
        hash = await sha256Hex(upload);
      } catch {
        setError('Could not read the file.');
        return;
      }

      const presign = await presignAction(upload.type || 'image/jpeg', hash);
      if (!presign.ok || !presign.presigned) {
        setError(presign.error ?? 'Could not start the upload.');
        return;
      }

      try {
        await uploadToPresignedUrl(presign.presigned.url, upload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed.');
        return;
      }

      const registered = await registerReceiptAction(presign.presigned.key, hash);
      if (!registered.ok) {
        setError(registered.error ?? 'Could not save the receipt.');
        return;
      }

      onSuccess?.(); // e.g. close the Scan modal
      // Land on the receipt's review screen so the user can verify + approve it.
      startTransition(() => router.push(registered.id ? `/receipts/${registered.id}` : '/receipts'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ''; // allow re-selecting the same file
          if (file) void handleFile(file);
        }}
      />
      <Button type="button" disabled={!!busy || pending} onClick={() => inputRef.current?.click()}>
        {busy ?? (pending ? 'Uploading…' : 'Scan receipt')}
      </Button>
      {error ? (
        <p style={{ color: 'var(--negative-500)', fontSize: 'var(--text-xs)', margin: 0 }}>{error}</p>
      ) : null}
    </div>
  );
}
