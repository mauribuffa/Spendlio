'use client';

import type { ReactNode } from 'react';
import { useActionState } from 'react';
import { Card, Avatar, Button, Input, Select } from '@spendlio/ui';
import { Mail, Languages, Clock, Check } from 'lucide-react';
import { CURRENCY_DECIMALS, type User } from '@spendlio/contracts';
import { FormField } from '@/components/form/form-field';
import { FieldError } from '@/components/form/field-error';
import { updateMeAction, type ActionResult } from '@/features/settings/lib/actions';

const CURRENCIES = Object.keys(CURRENCY_DECIMALS).sort();

const initial: ActionResult = { ok: false };

const eyebrow = {
  display: 'block',
  textTransform: 'uppercase' as const,
  letterSpacing: 'var(--tracking-caps)',
  fontSize: 'var(--text-2xs)',
  fontWeight: 'var(--weight-semibold)',
  color: 'var(--text-subtle)',
  padding: '0 4px var(--space-2)',
};

/** Icon chip + label + trailing value/control row inside a section card. */
function Row({
  icon,
  color,
  label,
  value,
  trailing,
  last,
}: {
  icon: ReactNode;
  color: string;
  label: string;
  value?: ReactNode;
  trailing?: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        padding: '13px 0',
        borderTop: last ? 'none' : '1px solid var(--border-subtle)',
      }}
    >
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `color-mix(in oklab, ${color} 14%, white)`,
          color,
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: 'var(--text-strong)' }}>{label}</span>
      {value != null && (
        <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>{value}</span>
      )}
      {trailing}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div style={eyebrow}>{title}</div>
      <Card padding="lg" style={{ borderRadius: 'var(--radius-xl)' }}>
        {children}
      </Card>
    </div>
  );
}

/** Editable profile form: name + base currency. Read-only profile shown alongside. */
export function SettingsForm({ user }: { user: User }) {
  const [state, formAction, pending] = useActionState(updateMeAction, initial);
  const fieldError = (name: string) => state.fieldErrors?.[name]?.[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Profile header */}
      <Card padding="lg" style={{ borderRadius: 'var(--radius-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar name={user.name} size="lg" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 'var(--weight-bold)',
                fontSize: 18,
                color: 'var(--text-strong)',
              }}
            >
              {user.name}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user.email}</div>
          </div>
        </div>
      </Card>

      {/* Editable preferences */}
      <Section title="Preferences">
        <form action={formAction} style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <FormField htmlFor="name" label="Name" error={fieldError('name')}>
            <Input id="name" name="name" defaultValue={user.name} invalid={!!fieldError('name')} required />
          </FormField>

          <div>
            <Select
              label="Base currency"
              name="defaultCurrency"
              defaultValue={user.defaultCurrency}
              options={CURRENCIES}
            />
            <FieldError>{fieldError('defaultCurrency')}</FieldError>
          </div>

          <FieldError>{state.error}</FieldError>
          {state.ok ? (
            <p
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--positive-500)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-medium)',
                margin: 0,
              }}
            >
              <Check size={15} strokeWidth={2.4} aria-hidden="true" />
              Saved.
            </p>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Section>

      {/* Read-only profile details */}
      <Section title="Profile">
        <Row
          icon={<Mail size={18} aria-hidden="true" />}
          color="var(--cat-3)"
          label="Email"
          value={user.email}
        />
        <Row
          icon={<Languages size={18} aria-hidden="true" />}
          color="var(--cat-1)"
          label="Locale"
          value={user.locale}
        />
        <Row
          icon={<Clock size={18} aria-hidden="true" />}
          color="var(--cat-2)"
          label="Time zone"
          value={user.timezone}
          last
        />
      </Section>

      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-subtle)' }}>Spendlio · v1.0.0</div>
    </div>
  );
}
