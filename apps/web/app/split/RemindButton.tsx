'use client';

import { useState, useTransition } from 'react';
import { Button } from '@spendlio/ui';
import { remindPersonAction } from './actions';

/** Nudge one person to settle up. Optimistic-ish: shows "Reminded" on success. */
export function RemindButton({ personId }: { personId: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function remind() {
    setError(null);
    startTransition(async () => {
      const res = await remindPersonAction(personId);
      if (res.ok) setDone(true);
      else setError(res.error ?? 'Could not send the reminder.');
    });
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={remind}
      disabled={pending || done}
      title={error ?? undefined}
    >
      {done ? 'Reminded' : pending ? 'Sending…' : 'Remind'}
    </Button>
  );
}
