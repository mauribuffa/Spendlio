'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, ChevronLeft } from 'lucide-react';
import { Button } from '@spendlio/ui';
import { completeOnboardingAction } from '@/features/onboarding/lib/actions';

// Post-auth onboarding interstitial (ADR-038). Rendered by the root layout when
// the signed-in user has no onboardedAt; the final step persists currency +
// language, then router.refresh() re-runs the layout gate so the app shell shows.
const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
];
const LOCALES = [
  { code: 'en-US', name: 'English', region: 'United States' },
  { code: 'es-AR', name: 'Español', region: 'Argentina' },
  { code: 'pt-BR', name: 'Português', region: 'Brasil' },
  { code: 'fr-FR', name: 'Français', region: 'France' },
];

function Shell({ children, maxWidth = 460 }: { children: React.ReactNode; maxWidth?: number }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        overflowY: 'auto',
        background:
          'radial-gradient(700px 460px at 50% -5%, var(--green-50), transparent 70%), var(--surface-canvas)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div style={{ width: '100%', maxWidth }}>{children}</div>
    </div>
  );
}

function SelectRow({
  selected,
  onClick,
  lead,
  title,
  sub,
}: {
  selected: boolean;
  onClick: () => void;
  lead: string;
  title: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        padding: '14px 16px',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--surface-card)',
        border: `1.5px solid ${selected ? 'var(--green-500)' : 'var(--border-subtle)'}`,
        boxShadow: selected ? 'var(--ring-brand)' : 'var(--shadow-xs)',
        transition: 'var(--transition-control)',
      }}
    >
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 16,
          background: selected ? 'var(--green-600)' : 'var(--surface-sunken)',
          color: selected ? '#fff' : 'var(--text-muted)',
        }}
      >
        {lead}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--text-strong)' }}>{title}</span>
        <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-muted)' }}>{sub}</span>
      </span>
      <span style={{ flex: 'none', color: selected ? 'var(--green-600)' : 'var(--border-default)' }}>
        {selected ? <CheckCircle2 size={22} strokeWidth={2} /> : <Circle size={22} strokeWidth={2} />}
      </span>
    </button>
  );
}

function Dots({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          style={{
            height: 6,
            borderRadius: 999,
            transition: 'all var(--dur-base) var(--ease-standard)',
            width: i === step ? 24 : 6,
            background: i === step ? 'var(--green-600)' : 'var(--neutral-300)',
          }}
        />
      ))}
    </div>
  );
}

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [locale, setLocale] = useState('en-US');
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const finish = () => {
    setError(null);
    startSaving(async () => {
      const res = await completeOnboardingAction({ defaultCurrency: currency, locale });
      if (res.ok) router.refresh(); // re-runs the layout gate → app shell
      else setError(res.error ?? 'Something went wrong.');
    });
  };

  if (step === 0) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" width={76} height={76} alt="Spendlio" />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 38, letterSpacing: '-0.02em', color: 'var(--green-900)' }}>
              Spendlio
            </div>
            <div style={{ fontSize: 17, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>
              Spend with clarity. Split without the awkward.
            </div>
          </div>
          <div style={{ width: '100%', maxWidth: 360, marginTop: 8 }}>
            <Button variant="primary" size="lg" fullWidth onClick={() => setStep(1)}>
              Get started
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  const isCurrency = step === 1;
  return (
    <Shell maxWidth={480}>
      <Dots step={step} total={3} />
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em', color: 'var(--text-strong)', lineHeight: 1.1, textAlign: 'center' }}>
        {isCurrency ? 'What currency do you think in?' : 'Choose your language'}
      </div>
      <div style={{ fontSize: 14.5, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5, textAlign: 'center', maxWidth: 380, marginInline: 'auto' }}>
        {isCurrency
          ? 'Your totals and budgets show in this. You can still add expenses in any currency.'
          : 'Read Spendlio in your language while keeping any base currency.'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '22px 0' }}>
        {isCurrency
          ? CURRENCIES.map((c) => (
              <SelectRow key={c.code} selected={currency === c.code} onClick={() => setCurrency(c.code)} lead={c.symbol} title={c.name} sub={c.code} />
            ))
          : LOCALES.map((l) => (
              <SelectRow key={l.code} selected={locale === l.code} onClick={() => setLocale(l.code)} lead={l.code.slice(0, 2).toUpperCase()} title={l.name} sub={l.region} />
            ))}
      </div>
      {error && (
        <div role="alert" style={{ fontSize: 13.5, color: 'var(--negative-500)', textAlign: 'center', marginBottom: 12 }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 12 }}>
        <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)} disabled={saving} leadingIcon={<ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />}>
          Back
        </Button>
        <Button variant="primary" size="lg" fullWidth disabled={saving} onClick={() => (isCurrency ? setStep(2) : finish())}>
          {isCurrency ? 'Continue' : saving ? 'Setting up…' : 'Start tracking'}
        </Button>
      </div>
    </Shell>
  );
}
