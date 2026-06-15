'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Select, AmountInput, Button } from '@spendlio/ui';
import { settleUpAction, type ActionResult } from './actions';

interface Person {
  id: string;
  name: string;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'ARS', 'BRL', 'MXN'];
const initial: ActionResult = { ok: false };

export function SettleUpForm({ people }: { people: Person[] }) {
  const [state, formAction, pending] = useActionState(settleUpAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  if (people.length < 2) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>
        Add at least two people before you can settle up between them.
      </p>
    );
  }

  const options = people.map((p) => ({ value: p.id, label: p.name }));

  return (
    <form ref={formRef} action={formAction} style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <div style={{ display: 'grid', gap: 'var(--space-4)', gridTemplateColumns: '1fr 1fr' }}>
        <Select name="fromPersonId" label="Payer" options={options} placeholder="Who paid" defaultValue="" required />
        <Select name="toPersonId" label="Payee" options={options} placeholder="Who was paid" defaultValue="" required />
      </div>

      <div style={{ display: 'grid', gap: 'var(--space-4)', gridTemplateColumns: '2fr 1fr', alignItems: 'end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-strong)' }}>
            Amount
          </label>
          <AmountInput name="amountMajor" size="compact" currency="$" defaultValue="" required />
        </div>
        <Select name="currency" label="Currency" options={CURRENCIES} defaultValue="USD" />
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
        <p style={{ color: 'var(--positive-500)', fontSize: 'var(--text-sm)' }}>
          Payment recorded — you’re square.
        </p>
      ) : null}

      <Button type="submit" disabled={pending} style={{ width: '100%' }}>
        {pending ? 'Recording…' : 'Settle up'}
      </Button>
    </form>
  );
}
