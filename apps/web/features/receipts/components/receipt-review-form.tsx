'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Calculator } from 'lucide-react';
import { Button, IconButton, Input, Select, AmountInput, cn } from '@spendlio/ui';
import { getCurrencyDecimals } from '@spendlio/contracts';
import { confirmReceiptAction } from '@/features/receipts/lib/actions';

interface ItemRow {
  description: string;
  quantity: string;
  amountMajor: string;
}

interface Props {
  receiptId: string;
  merchant: string | null;
  /** ISO date string (or null) — prefilled into the date input. */
  occurredAt: string | null;
  currency: string;
  /** Integer minor units (or null). */
  totalMinor: number | null;
  /** Receipt line items in minor units. */
  lineItems: { description: string; quantity: number; amount: number }[];
  categories: { value: string; label: string }[];
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'ARS', 'BRL', 'MXN', 'JPY', 'CLP'];

/** Minor units → a human major string with the currency's decimal places. */
function toMajorStr(minor: number, currency: string): string {
  const d = getCurrencyDecimals(currency);
  return (minor / 10 ** d).toFixed(d);
}

/** YYYY-MM-DD for a date input. */
function toDateInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

export function ReceiptReviewForm({
  receiptId,
  merchant,
  occurredAt,
  currency: initialCurrency,
  totalMinor,
  lineItems,
  categories,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [currency, setCurrency] = useState(initialCurrency || 'USD');
  const [merchantVal, setMerchant] = useState(merchant ?? '');
  const [dateVal, setDate] = useState(toDateInput(occurredAt) || new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('');
  const [total, setTotal] = useState(totalMinor != null ? toMajorStr(totalMinor, initialCurrency || 'USD') : '');
  const [items, setItems] = useState<ItemRow[]>(
    lineItems.map((li) => ({
      description: li.description,
      quantity: String(li.quantity),
      amountMajor: toMajorStr(li.amount, initialCurrency || 'USD'),
    })),
  );

  const setItem = (i: number, patch: Partial<ItemRow>) =>
    setItems((prev) => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const addItem = () => setItems((prev) => [...prev, { description: '', quantity: '1', amountMajor: '' }]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, j) => j !== i));

  const autoSum = () => {
    const sum = items.reduce((s, it) => s + (Number(it.amountMajor) || 0), 0);
    const d = getCurrencyDecimals(currency);
    setTotal(sum.toFixed(d));
  };

  function approve() {
    setError(null);
    if (!category) {
      setError('Pick a category for this expense.');
      return;
    }
    if (!(Number(total) > 0)) {
      setError('Enter a total greater than zero.');
      return;
    }
    startTransition(async () => {
      const res = await confirmReceiptAction(receiptId, {
        merchant: merchantVal.trim() || null,
        occurredAt: dateVal,
        currency,
        category,
        totalMajor: Number(total),
        lineItems: items
          .filter((it) => it.description.trim() !== '' || Number(it.amountMajor) > 0)
          .map((it) => ({
            description: it.description.trim() || 'Item',
            quantity: Math.max(1, Math.round(Number(it.quantity) || 1)),
            amountMajor: Number(it.amountMajor) || 0,
          })),
      });
      if (res.ok) {
        router.refresh(); // detail page re-renders the "Converted ✓" panel
      } else {
        setError(res.error || Object.values(res.fieldErrors ?? {}).flat().join(' ') || 'Could not save.');
      }
    });
  }

  const labelStyle = {
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-semibold)',
    color: 'var(--text-strong)',
  } as const;

  return (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <div className={cn('spl-form-row')} style={{ gap: 'var(--space-4)', '--spl-cols': '2fr 1fr' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={labelStyle}>Merchant</label>
          <Input value={merchantVal} onChange={(e) => setMerchant(e.target.value)} placeholder="Merchant" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={labelStyle}>Date</label>
          <Input type="date" value={dateVal} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className={cn('spl-form-row')} style={{ gap: 'var(--space-4)' }}>
        <Select
          label="Category"
          options={categories}
          placeholder="Pick a category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        />
        <Select
          label="Currency"
          options={CURRENCIES}
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        />
      </div>

      {/* Line items */}
      <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
        <span style={labelStyle}>Line items</span>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 56px 110px 36px', gap: 'var(--space-2)', alignItems: 'center' }}>
            <Input value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} placeholder="Item" />
            <Input value={it.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} inputMode="numeric" aria-label="Quantity" />
            <AmountInput size="compact" currency={currency} value={it.amountMajor} onChange={(e) => setItem(i, { amountMajor: e.target.value })} />
            <IconButton
              label="Remove item"
              variant="ghost"
              onClick={() => removeItem(i)}
              icon={<Trash2 size={16} strokeWidth={2} aria-hidden="true" />}
            />
          </div>
        ))}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button variant="ghost" size="sm" onClick={addItem} leadingIcon={<Plus size={15} strokeWidth={2} aria-hidden="true" />}>
            Add item
          </Button>
          <Button variant="ghost" size="sm" onClick={autoSum} leadingIcon={<Calculator size={15} strokeWidth={2} aria-hidden="true" />}>
            Sum to total
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={labelStyle}>Total</label>
        <AmountInput currency={currency} value={total} onChange={(e) => setTotal(e.target.value)} />
      </div>

      {error ? <p style={{ color: 'var(--negative-500)', fontSize: 'var(--text-sm)', margin: 0 }}>{error}</p> : null}

      <Button onClick={approve} disabled={pending} style={{ width: '100%' }}>
        {pending ? 'Saving…' : 'Approve & add expense'}
      </Button>
    </div>
  );
}
