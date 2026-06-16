'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { ScanLine, ArrowLeftRight, Check, Receipt } from 'lucide-react';
import {
  Modal,
  AmountInput,
  Input,
  SegmentedControl,
  Switch,
  Checkbox,
  Avatar,
  CategoryIcon,
  Button,
} from '@spendlio/ui';
import { type CategoryKey, toMinorUnits, getCurrencyDecimals, formatMoney } from '@spendlio/contracts';
import type { Person } from '@/lib/resources';
import { loadPeople, loadDefaultCurrency, createExpenseAction } from './expense-actions';

type SplitMode = 'even' | 'exact' | 'percent';

// The quick-pick categories shown as icon chips (the rest stay reachable via
// the full transactions flow). Order mirrors the design.
const QUICK_CATS: CategoryKey[] = ['groceries', 'dining', 'transport', 'shopping', 'travel', 'subscriptions'];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function AddExpenseModal({
  open,
  onClose,
  onScan,
}: {
  open: boolean;
  onClose: () => void;
  onScan: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryKey>('dining');
  const [splitOn, setSplitOn] = useState(false);
  const [mode, setMode] = useState<SplitMode>('even');
  const [people, setPeople] = useState<Person[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [exact, setExact] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Load people + the user's default currency the first time the modal opens.
  // Guarded by a `loaded` flag (not people.length, which never settles for a
  // user with no people and would re-fetch on every open).
  useEffect(() => {
    if (!open || loaded) return;
    setLoaded(true);
    void loadPeople().then(setPeople);
    void loadDefaultCurrency().then(setCurrency);
  }, [open, loaded]);

  // Reset transient state on close.
  useEffect(() => {
    if (!open) {
      setError(null);
    }
  }, [open]);

  const amountCents = toMinorUnits(parseFloat(amount) || 0, currency);
  const selected = useMemo(() => people.filter((p) => picked[p.id]), [people, picked]);
  // Each person's even share, with you counted in the divisor (you + selected).
  const evenEach = selected.length > 0 ? Math.round(amountCents / (selected.length + 1)) : 0;

  const fmt = (cents: number) => formatMoney({ amount: cents, currency });

  function shareCentsFor(personId: string): number {
    if (mode === 'even') return evenEach;
    if (mode === 'exact') return toMinorUnits(parseFloat(exact[personId] ?? '') || 0, currency);
    // percent
    return Math.round((amountCents * (parseFloat(exact[personId] ?? '') || 0)) / 100);
  }

  function submit() {
    setError(null);
    const split =
      splitOn && selected.length > 0
        ? { mode, shares: selected.map((p) => ({ personId: p.id, cents: shareCentsFor(p.id) })) }
        : null;
    startTransition(async () => {
      const res = await createExpenseAction({
        amountMajor: parseFloat(amount) || 0,
        description,
        category,
        currency,
        split,
      });
      if (!res.ok || res.error) {
        setError(res.error ?? Object.values(res.fieldErrors ?? {})[0]?.[0] ?? 'Could not save.');
        if (!res.ok) return;
      }
      // success (possibly with a soft split note already shown)
      setAmount('');
      setDescription('');
      setPicked({});
      setSplitOn(false);
      onClose();
    });
  }

  const placeholderPct = selected.length > 0 ? Math.floor(100 / (selected.length + 1)) : 0;

  return (
    <Modal open={open} onClose={onClose} title="Add expense" width={480}>
      <div style={{ padding: '4px 22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button
          type="button"
          onClick={onScan}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            cursor: 'pointer',
            border: '1px dashed var(--green-300)',
            background: 'var(--surface-brand-sub)',
            color: 'var(--green-800)',
            borderRadius: 'var(--radius-lg)',
            padding: 12,
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <ScanLine size={18} strokeWidth={2} aria-hidden="true" /> Scan a receipt instead
        </button>

        <AmountInput value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />

        <div>
          <label
            htmlFor="exp-desc"
            style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-body)', marginBottom: 6 }}
          >
            Description
          </label>
          <div style={{ position: 'relative' }}>
            <Receipt
              size={18}
              strokeWidth={2}
              aria-hidden="true"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }}
            />
            <Input
              id="exp-desc"
              placeholder="e.g. Dinner at Olio"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ paddingLeft: 38 }}
            />
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', marginBottom: 8 }}>Category</div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {QUICK_CATS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                style={{
                  flex: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: category === c ? 1 : 0.5,
                  transition: 'opacity var(--dur-fast) var(--ease-standard)',
                }}
              >
                <span style={{ borderRadius: 999, boxShadow: category === c ? 'var(--ring-brand)' : 'none' }}>
                  <CategoryIcon category={c} size="lg" />
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{cap(c)}</span>
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-sunken)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 16px',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ArrowLeftRight size={18} strokeWidth={2} aria-hidden="true" />
            <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-strong)' }}>Split this expense</span>
          </span>
          <Switch checked={splitOn} onChange={(e) => setSplitOn(e.target.checked)} />
        </div>

        {splitOn && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {people.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Add people on the People page first to split with them.
              </p>
            ) : (
              <>
                <SegmentedControl
                  ariaLabel="Split mode"
                  options={[
                    { value: 'even', label: 'Evenly' },
                    { value: 'exact', label: 'Exact' },
                    { value: 'percent', label: '%' },
                  ]}
                  value={mode}
                  onChange={(v) => setMode(v as SplitMode)}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 4px' }}>
                    <Avatar name="You" color="var(--green-600)" size="sm" />
                    <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: 'var(--text-strong)' }}>You</span>
                    <span data-money style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>
                      {fmt(Math.max(0, amountCents - selected.reduce((s, p) => s + shareCentsFor(p.id), 0)))}
                    </span>
                  </div>
                  {people.map((p) => {
                    const on = !!picked[p.id];
                    return (
                      <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 4px', cursor: 'pointer' }}>
                        <Checkbox round checked={on} onChange={(e) => setPicked((s) => ({ ...s, [p.id]: e.target.checked }))} />
                        <Avatar name={p.name} size="sm" />
                        <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: 'var(--text-strong)' }}>{p.name}</span>
                        {on &&
                          (mode === 'even' ? (
                            <span data-money style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>{fmt(evenEach)}</span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              {mode === 'exact' && <span style={{ color: 'var(--text-subtle)', fontSize: 13 }}>$</span>}
                              <input
                                type="number"
                                inputMode="decimal"
                                value={exact[p.id] ?? ''}
                                placeholder={
                                  mode === 'percent'
                                    ? String(placeholderPct)
                                    : (evenEach / 10 ** getCurrencyDecimals(currency)).toFixed(getCurrencyDecimals(currency))
                                }
                                onChange={(e) => setExact((s) => ({ ...s, [p.id]: e.target.value }))}
                                style={{
                                  width: 64,
                                  textAlign: 'right',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '4px 8px',
                                  fontFamily: 'var(--font-sans)',
                                  fontSize: 13,
                                  color: 'var(--text-strong)',
                                  background: 'var(--surface-card)',
                                }}
                              />
                              {mode === 'percent' && <span style={{ color: 'var(--text-subtle)', fontSize: 13 }}>%</span>}
                            </span>
                          ))}
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {error && <p style={{ color: 'var(--negative-500)', fontSize: 'var(--text-xs)', margin: 0 }}>{error}</p>}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={pending || amountCents <= 0 || description.trim() === ''}
          leadingIcon={<Check size={18} strokeWidth={2} aria-hidden="true" />}
          onClick={submit}
        >
          {pending ? 'Saving…' : splitOn && selected.length > 0 ? 'Add & split' : 'Add expense'}
        </Button>
      </div>
    </Modal>
  );
}
