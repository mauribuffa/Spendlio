'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@spendlio/ui';
import { requestOtpAction } from '../lib/actions';

export function SignInForm({ devEnabled }: { devEnabled: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setHint(null);
    const res = await requestOtpAction(email);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Something went wrong.');
      return;
    }
    setStep('code');
    if (res.devCode) setHint(`Dev code: ${res.devCode}`);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn('otp', { email, code, redirect: false });
    setBusy(false);
    if (res?.error) {
      setError('That code is incorrect or expired.');
      return;
    }
    router.push('/');
    router.refresh();
  }

  async function devLogin() {
    setBusy(true);
    setError(null);
    const res = await signIn('dev', { redirect: false });
    setBusy(false);
    if (res?.error) {
      setError('Dev login failed.');
      return;
    }
    router.push('/');
    router.refresh();
  }

  const label = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-strong)' } as const;
  const input = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-subtle)',
    fontSize: 15,
    fontFamily: 'var(--font-sans)',
    background: 'var(--surface-card)',
  } as const;

  return (
    <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.svg" width={32} height={32} alt="" />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--green-900)' }}>
          Spendlio
        </span>
      </div>

      {step === 'email' ? (
        <form onSubmit={sendCode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label htmlFor="email" style={label}>Email</label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={input}
            />
          </div>
          <Button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send code'}</Button>
        </form>
      ) : (
        <form onSubmit={verifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label htmlFor="code" style={label}>Enter the 6-digit code sent to {email}</label>
            <input
              id="code"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              style={{ ...input, letterSpacing: '0.3em', textAlign: 'center' }}
            />
          </div>
          <Button type="submit" disabled={busy}>{busy ? 'Verifying…' : 'Verify & sign in'}</Button>
          <button
            type="button"
            onClick={() => { setStep('email'); setCode(''); setError(null); setHint(null); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}
          >
            ← Use a different email
          </button>
        </form>
      )}

      {hint && <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{hint}</p>}
      {error && <p role="alert" style={{ fontSize: 13, color: 'var(--negative-500)' }}>{error}</p>}

      {devEnabled && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
          <button
            type="button"
            onClick={devLogin}
            disabled={busy}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-subtle)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Dev: sign in as demo user
          </button>
        </div>
      )}
    </div>
  );
}
