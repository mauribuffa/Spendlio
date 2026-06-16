'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Button, Input, Card, SegmentedControl, Select } from '@spendlio/ui';
import { createTransactionAction, type ActionResult } from '@/features/transactions/lib/actions';

const CATEGORIES = [
  'groceries', 'dining', 'transport', 'housing', 'utilities', 'shopping',
  'health', 'entertainment', 'travel', 'subscriptions', 'income', 'transfer',
] as const;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: cap(c) }));

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

  // Clear the form once a create succeeds, and notify the host (modal).
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onSuccess?.();
    }
  }, [state.ok, onSuccess]);

  const fieldError = (name: string) => state.fieldErrors?.[name]?.[0];

  const labelStyle = {
    display: 'block',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    color: 'var(--text-muted)',
    marginBottom: 'var(--space-1)',
  } as const;

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

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-4)' }}>
          <div>
            <label htmlFor="title" style={labelStyle}>Title</label>
            <Input id="title" name="title" placeholder="Coffee" invalid={!!fieldError('title')} required />
            {fieldError('title') ? <FieldError>{fieldError('title')}</FieldError> : null}
          </div>
          <div>
            <label htmlFor="amountMajor" style={labelStyle}>Amount</label>
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
            {fieldError('amountMajor') ? <FieldError>{fieldError('amountMajor')}</FieldError> : null}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
          <div>
            <label htmlFor="category" style={labelStyle}>Category</label>
            <Select id="category" name="category" defaultValue="dining" options={CATEGORY_OPTIONS} />
          </div>
          <div>
            <label htmlFor="currency" style={labelStyle}>Currency</label>
            <Input id="currency" name="currency" defaultValue="USD" maxLength={3} />
          </div>
          <div>
            <label htmlFor="occurredAt" style={labelStyle}>Date</label>
            <Input id="occurredAt" name="occurredAt" type="date" invalid={!!fieldError('occurredAt')} required />
            {fieldError('occurredAt') ? <FieldError>{fieldError('occurredAt')}</FieldError> : null}
          </div>
        </div>

        <div>
          <label htmlFor="merchant" style={labelStyle}>Merchant (optional)</label>
          <Input id="merchant" name="merchant" placeholder="Blue Bottle" />
        </div>

        {state.error ? <FieldError>{state.error}</FieldError> : null}

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

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: 'var(--negative-500)', fontSize: 'var(--text-xs)', margin: 'var(--space-1) 0 0' }}>
      {children}
    </p>
  );
}
