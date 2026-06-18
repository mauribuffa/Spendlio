'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Button, Input, Card, SegmentedControl, Select, cn, capitalize } from '@spendlio/ui';
import { FormField } from '@/components/form/form-field';
import { FieldError } from '@/components/form/field-error';
import { useToast } from '@/components/feedback/toast-provider';
import { createTransactionAction, type ActionResult } from '@/features/transactions/lib/actions';

const CATEGORIES = [
  'groceries', 'dining', 'transport', 'housing', 'utilities', 'shopping',
  'health', 'entertainment', 'travel', 'subscriptions', 'income', 'transfer',
] as const;

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: capitalize(c) }));

const initial: ActionResult = { ok: false };

export interface AddTransactionFormProps {
  /** Render without the outer Card + heading (e.g. inside a Modal). */
  bare?: boolean;
  /** Called once a create succeeds (e.g. to close a modal). */
  onSuccess?: () => void;
}

/**
 * Inline "add expense" form. Submits through the createTransactionAction server
 * action (Zod-validated against contracts), then the list revalidates.
 */
export function AddTransactionForm({ bare = false, onSuccess }: AddTransactionFormProps = {}) {
  const [state, formAction, pending] = useActionState(createTransactionAction, initial);
  const [direction, setDirection] = useState<'expense' | 'income'>('expense');
  const formRef = useRef<HTMLFormElement>(null);
  const { success } = useToast();

  // Clear the form once a create succeeds, and notify the host (modal).
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      success('Transaction added.');
      onSuccess?.();
    }
  }, [state.ok, onSuccess, success]);

  const fieldError = (name: string) => state.fieldErrors?.[name]?.[0];

  const form = (
      <form ref={formRef} action={formAction} style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)' }}>
          {bare ? <span /> : <h2 style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-display)' }}>Add a transaction</h2>}
          <SegmentedControl
            ariaLabel="Direction"
            options={[
              { value: 'expense', label: 'Expense' },
              { value: 'income', label: 'Income' },
            ]}
            value={direction}
            onChange={setDirection}
          />
        </div>
        <input type="hidden" name="direction" value={direction} />

        <div className={cn('spl-form-row')} style={{ gap: 'var(--space-4)', '--spl-cols': '2fr 1fr' }}>
          <FormField htmlFor="title" label="Title" error={fieldError('title')}>
            <Input id="title" name="title" placeholder="Coffee" invalid={!!fieldError('title')} required />
          </FormField>
          <FormField htmlFor="amountMajor" label="Amount" error={fieldError('amountMajor')}>
            <Input
              id="amountMajor"
              name="amountMajor"
              type="number"
              step="0.01"
              min="0"
              placeholder="6.75"
              invalid={!!fieldError('amountMajor')}
              required
            />
          </FormField>
        </div>

        <div className={cn('spl-form-row')} style={{ gap: 'var(--space-4)', '--spl-cols': 'repeat(3, 1fr)' }}>
          <FormField htmlFor="category" label="Category">
            <Select id="category" name="category" defaultValue="dining" options={CATEGORY_OPTIONS} />
          </FormField>
          <FormField htmlFor="currency" label="Currency">
            <Input id="currency" name="currency" defaultValue="USD" maxLength={3} />
          </FormField>
          <FormField htmlFor="occurredAt" label="Date" error={fieldError('occurredAt')}>
            <Input id="occurredAt" name="occurredAt" type="date" invalid={!!fieldError('occurredAt')} required />
          </FormField>
        </div>

        <FormField htmlFor="merchant" label="Merchant (optional)">
          <Input id="merchant" name="merchant" placeholder="Blue Bottle" />
        </FormField>

        <FieldError>{state.error}</FieldError>

        <div style={{ display: 'flex', justifyContent: bare ? 'stretch' : 'flex-end' }}>
          <Button type="submit" disabled={pending} fullWidth={bare}>
            {pending ? 'Saving…' : 'Add transaction'}
          </Button>
        </div>
      </form>
  );

  if (bare) return form;
  return (
    <Card padding="lg" style={{ marginBottom: 'var(--space-6)' }}>
      {form}
    </Card>
  );
}
