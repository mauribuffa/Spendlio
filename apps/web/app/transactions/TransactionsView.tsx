'use client';

import { useMemo, useState } from 'react';
import { Card, Badge, Button, Input, MoneyAmount, CategoryIcon, Tag } from '@spendlio/ui';
import type { TransactionStatus } from '@spendlio/contracts';
import type { Transaction, Account } from '../../lib/resources';
import { AddTransactionForm } from './AddTransactionForm';

type Tone = 'neutral' | 'primary' | 'positive' | 'negative' | 'accent';

const STATUS_BADGE: Record<TransactionStatus, { tone: Tone; label: string }> = {
  cleared: { tone: 'neutral', label: 'Cleared' },
  pending: { tone: 'accent', label: 'Pending' },
  split: { tone: 'primary', label: 'Split' },
  recurring: { tone: 'accent', label: 'Recurring' },
  income: { tone: 'positive', label: 'Income' },
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Column template shared by the header row and each transaction row. */
const COLS = '1fr 140px 90px 110px 120px';

export function TransactionsView({
  transactions,
  accounts,
}: {
  transactions: Transaction[];
  accounts: Account[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [cat, setCat] = useState<string>('all');
  const [query, setQuery] = useState('');

  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  // Distinct categories present, in first-seen order, for the filter chips.
  const categories = useMemo(() => {
    const seen: string[] = [];
    for (const t of transactions) if (!seen.includes(t.category)) seen.push(t.category);
    return seen;
  }, [transactions]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (cat !== 'all' && t.category !== cat) return false;
      if (!q) return true;
      return t.title.toLowerCase().includes(q) || (t.merchant ?? '').toLowerCase().includes(q);
    });
  }, [transactions, cat, query]);

  const accountLabel = (t: Transaction): string => {
    const a = t.accountId ? accountById.get(t.accountId) : undefined;
    if (!a) return '—';
    return a.last4 ? `${cap(a.type)} ••${a.last4}` : cap(a.type);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Toolbar: filter chips · search · add-expense */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', flex: 1 }}>
          <Tag selectable selected={cat === 'all'} onClick={() => setCat('all')}>
            All
          </Tag>
          {categories.map((c) => (
            <Tag key={c} selectable selected={cat === c} onClick={() => setCat(c)} style={{ textTransform: 'capitalize' }}>
              {c}
            </Tag>
          ))}
        </div>
        <div style={{ width: 220 }}>
          <Input
            type="search"
            placeholder="Search transactions"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button type="button" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Close' : '+ Add expense'}
        </Button>
      </div>

      {showForm ? <AddTransactionForm /> : null}

      <Card padding="none">
        {/* Header row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: COLS,
            gap: 'var(--space-4)',
            padding: 'var(--space-3) var(--space-5)',
            borderBottom: '1px solid var(--color-border)',
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--weight-semibold)',
            letterSpacing: 'var(--tracking-eyebrow)',
            textTransform: 'uppercase',
            color: 'var(--color-ink-subtle)',
          }}
        >
          <span>Transaction</span>
          <span>Account</span>
          <span>Date</span>
          <span>Status</span>
          <span style={{ textAlign: 'right' }}>Amount</span>
        </div>

        {visible.length === 0 ? (
          <p style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-ink-subtle)' }}>
            No transactions match. Try a different filter, or add one.
          </p>
        ) : (
          visible.map((t, i) => {
            const badge = STATUS_BADGE[t.status];
            return (
              <div
                key={t.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: COLS,
                  gap: 'var(--space-4)',
                  alignItems: 'center',
                  padding: 'var(--space-4) var(--space-5)',
                  borderBottom: i === visible.length - 1 ? 'none' : '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
                  <CategoryIcon category={t.category} size="sm" />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 'var(--weight-semibold)',
                        color: 'var(--color-ink)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {t.title}
                    </div>
                    {t.merchant ? (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)' }}>{t.merchant}</div>
                    ) : null}
                  </div>
                </div>

                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-ink-muted)',
                  }}
                >
                  {accountLabel(t)}
                </span>

                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)' }}>
                  {new Date(t.occurredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>

                <span>
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                </span>

                <span style={{ textAlign: 'right' }}>
                  <MoneyAmount amount={t.amount} currency={t.currency} color="auto" />
                </span>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
