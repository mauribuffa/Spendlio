'use client';

import { useActionState } from 'react';
import { Card, Avatar, Button, Input, Select } from '@spendlio/ui';
import { CURRENCY_DECIMALS, type User } from '@spendlio/contracts';
import { updateMeAction, type ActionResult } from './actions';

const CURRENCIES = Object.keys(CURRENCY_DECIMALS).sort();

const initial: ActionResult = { ok: false };

const labelStyle = {
  display: 'block',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--weight-medium)',
  color: 'var(--text-muted)',
  marginBottom: 'var(--space-1)',
} as const;

/** Editable profile form: name + base currency. Read-only fields shown below. */
export function SettingsForm({ user }: { user: User }) {
  const [state, formAction, pending] = useActionState(updateMeAction, initial);
  const fieldError = (name: string) => state.fieldErrors?.[name]?.[0];

  return (
    <Card padding="lg">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <Avatar name={user.name} size="lg" />
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-xl)' }}>
            {user.name}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>{user.email}</div>
        </div>
      </div>

      <form action={formAction} style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <div>
          <label htmlFor="name" style={labelStyle}>Name</label>
          <Input id="name" name="name" defaultValue={user.name} invalid={!!fieldError('name')} required />
          {fieldError('name') ? <FieldError>{fieldError('name')}</FieldError> : null}
        </div>

        <div>
          <Select
            label="Default currency"
            name="defaultCurrency"
            defaultValue={user.defaultCurrency}
            options={CURRENCIES}
          />
          {fieldError('defaultCurrency') ? <FieldError>{fieldError('defaultCurrency')}</FieldError> : null}
        </div>

        {state.error ? <FieldError>{state.error}</FieldError> : null}
        {state.ok ? (
          <p style={{ color: 'var(--positive-500)', fontSize: 'var(--text-sm)', margin: 0 }}>Saved.</p>
        ) : null}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>

      <div style={{ marginTop: 'var(--space-5)' }}>
        <Row label="Locale" value={user.locale} />
        <Row label="Timezone" value={user.timezone} />
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: 'var(--space-3) 0',
        borderBottom: '1px solid var(--border-subtle)',
        fontSize: 'var(--text-sm)',
      }}
    >
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 'var(--weight-medium)' }}>{value}</span>
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: 'var(--negative-500)', fontSize: 'var(--text-xs)', margin: 'var(--space-1) 0 0' }}>
      {children}
    </p>
  );
}
