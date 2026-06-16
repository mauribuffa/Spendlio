'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Button, Input, Card, cn } from '@spendlio/ui';
import { FormField } from '@/components/form/FormField';
import { FieldError } from '@/components/form/FieldError';
import { useToast } from '@/components/feedback/ToastProvider';
import { createPersonAction, type ActionResult } from '@/features/people/lib/actions';

const initial: ActionResult = { ok: false };

/**
 * Inline "add person" form. Submits through the createPersonAction server
 * action (Zod-validated against contracts), then the list revalidates.
 */
export function AddPersonForm() {
  const [state, formAction, pending] = useActionState(createPersonAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const { success } = useToast();

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      success('Person added.');
    }
  }, [state.ok, success]);

  const fieldError = (name: string) => state.fieldErrors?.[name]?.[0];

  return (
    <Card padding="lg" style={{ marginBottom: 'var(--space-6)' }}>
      <form ref={formRef} action={formAction} style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-display)' }}>Add a person</h2>

        <div className={cn('spl-form-row')} style={{ gap: 'var(--space-4)' }}>
          <FormField htmlFor="name" label="Name" error={fieldError('name')}>
            <Input id="name" name="name" placeholder="Maya" invalid={!!fieldError('name')} required />
          </FormField>
          <FormField htmlFor="email" label="Email (optional)" error={fieldError('email')}>
            <Input id="email" name="email" type="email" placeholder="maya@example.com" invalid={!!fieldError('email')} />
          </FormField>
        </div>

        <FormField htmlFor="avatarUrl" label="Avatar URL (optional)" error={fieldError('avatarUrl')}>
          <Input id="avatarUrl" name="avatarUrl" type="url" placeholder="https://…" invalid={!!fieldError('avatarUrl')} />
        </FormField>

        <FieldError>{state.error}</FieldError>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" disabled={pending}>
            {pending ? 'Adding…' : 'Add person'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
