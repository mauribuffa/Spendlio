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
