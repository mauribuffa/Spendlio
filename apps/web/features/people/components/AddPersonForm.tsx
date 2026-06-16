'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Button, Input, Card } from '@spendlio/ui';
import { createPersonAction, type ActionResult } from '@/features/people/lib/actions';

const initial: ActionResult = { ok: false };

/**
 * Inline "add person" form. Submits through the createPersonAction server
 * action (Zod-validated against contracts), then the list revalidates.
 */
export function AddPersonForm() {
  const [state, formAction, pending] = useActionState(createPersonAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  const fieldError = (name: string) => state.fieldErrors?.[name]?.[0];

  const labelStyle = {
    display: 'block',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    color: 'var(--text-muted)',
    marginBottom: 'var(--space-1)',
  } as const;

  return (
    <Card padding="lg" style={{ marginBottom: 'var(--space-6)' }}>
      <form ref={formRef} action={formAction} style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-display)' }}>Add a person</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <div>
            <label htmlFor="name" style={labelStyle}>Name</label>
            <Input id="name" name="name" placeholder="Maya" invalid={!!fieldError('name')} required />
            {fieldError('name') ? <FieldError>{fieldError('name')}</FieldError> : null}
          </div>
          <div>
            <label htmlFor="email" style={labelStyle}>Email (optional)</label>
            <Input id="email" name="email" type="email" placeholder="maya@example.com" invalid={!!fieldError('email')} />
            {fieldError('email') ? <FieldError>{fieldError('email')}</FieldError> : null}
          </div>
        </div>

        <div>
          <label htmlFor="avatarUrl" style={labelStyle}>Avatar URL (optional)</label>
          <Input id="avatarUrl" name="avatarUrl" type="url" placeholder="https://…" invalid={!!fieldError('avatarUrl')} />
          {fieldError('avatarUrl') ? <FieldError>{fieldError('avatarUrl')}</FieldError> : null}
        </div>

        {state.error ? <FieldError>{state.error}</FieldError> : null}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" disabled={pending}>
            {pending ? 'Adding…' : 'Add person'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: 'var(--negative-500)', fontSize: 'var(--text-xs)', margin: 'var(--space-1) 0 0' }}>
      {children}
    </p>
  );
}
