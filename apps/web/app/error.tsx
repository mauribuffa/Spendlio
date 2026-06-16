'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, EmptyState, Button } from '@spendlio/ui';

/**
 * Route-level error boundary. Catches errors thrown while rendering a page's
 * server component (e.g. an unexpected API failure) and offers a retry instead
 * of a blank crash. Must be a client component per the App Router contract.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error in the console for debugging; the digest links it to
    // the server log entry in production.
    console.error(error);
  }, [error]);

  return (
    <div style={{ paddingTop: 40 }}>
      <Card padding="lg">
        <EmptyState
          icon={<AlertTriangle size={22} strokeWidth={2} aria-hidden="true" />}
          title="Something went wrong"
          message="This page hit an unexpected error. Try again — if it keeps happening, the API may be unreachable."
          action={<Button onClick={reset}>Try again</Button>}
        />
      </Card>
    </div>
  );
}
