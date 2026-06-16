'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Input, Checkbox, Button } from '@spendlio/ui';
import { createGroupAction, type ActionResult } from '@/features/split/lib/actions';

interface Person {
  id: string;
  name: string;
}

const initial: ActionResult = { ok: false };

export function AddGroupForm({ people }: { people: Person[] }) {
  const [state, formAction, pending] = useActionState(createGroupAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  if (people.length === 0) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>
        Add a few people first, then group them.
      </p>
    );
  }

  return (
    <form ref={formRef} action={formAction} style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-strong)' }}>
          Group name
        </label>
        <Input name="name" placeholder="Roommates" required />
      </div>

      <div style={{ display: 'grid', gap: '6px' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-strong)' }}>
          Members
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          {people.map((p) => (
            <Checkbox key={p.id} name="memberIds" value={p.id} label={p.name} />
          ))}
        </div>
      </div>

      {state.error ? (
        <p style={{ color: 'var(--negative-500)', fontSize: 'var(--text-sm)' }}>{state.error}</p>
      ) : null}
      {state.fieldErrors
        ? Object.entries(state.fieldErrors).map(([field, msgs]) => (
            <p key={field} style={{ color: 'var(--negative-500)', fontSize: 'var(--text-sm)' }}>
              {msgs.join(' ')}
            </p>
          ))
        : null}
      {state.ok ? (
        <p style={{ color: 'var(--positive-500)', fontSize: 'var(--text-sm)' }}>Group created.</p>
      ) : null}

      <Button type="submit" disabled={pending} style={{ width: '100%' }}>
        {pending ? 'Creating…' : 'New group'}
      </Button>
    </form>
  );
}
