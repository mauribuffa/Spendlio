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
