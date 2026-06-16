'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Card, Badge, Input, MoneyAmount, CategoryIcon, Tag } from '@spendlio/ui';
import type { BadgeTone } from '@spendlio/ui';
import type { TransactionStatus } from '@spendlio/contracts';
import type { Transaction, Account } from '@/lib/resources';

/** Status pill mapping — mirrors the canonical Transactions table. */
const STATUS_BADGE: Record<TransactionStatus, { tone: BadgeTone; label: string }> = {
  split: { tone: 'brand', label: 'Split' },
  income: { tone: 'positive', label: 'Income' },
  recurring: { tone: 'info', label: 'Recurring' },
  pending: { tone: 'warning', label: 'Pending' },
  cleared: { tone: 'neutral', label: 'Cleared' },
};

/** Fixed filter set + leading dot color, per the design bundle. */
const FILTERS = [
  { key: 'all', label: 'All', color: null },
  { key: 'groceries', label: 'Groceries', color: 'var(--cat-1)' },
  { key: 'dining', label: 'Dining', color: 'var(--cat-2)' },
  { key: 'split', label: 'Split', color: 'var(--cat-5)' },
  { key: 'income', label: 'Income', color: 'var(--cat-1)' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const th: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 'var(--text-2xs)',
  fontWeight: 'var(--weight-bold)',
  letterSpacing: 'var(--tracking-caps)',
  textTransform: 'uppercase',
  color: 'var(--text-subtle)',
  padding: '16px var(--space-4) 12px',
};

export function TransactionsView({
  transactions,
  accounts,
}: {
  transactions: Transaction[];
  accounts: Account[];
}) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');

  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'split'
            ? t.status === 'split' || !!t.splitId
            : filter === 'income'
              ? t.status === 'income'
              : t.category === filter;
      if (!matchesFilter) return false;
      if (!q) return true;
      return t.title.toLowerCase().includes(q) || (t.merchant ?? '').toLowerCase().includes(q);
    });
  }, [transactions, filter, query]);

  const accountLabel = (t: Transaction): string => {
    const a = t.accountId ? accountById.get(t.accountId) : undefined;
    if (!a) return '—';
    return a.last4 ? `${cap(a.type)} ••${a.last4}` : cap(a.type);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Toolbar: filter chips · search (Add expense lives in the topbar) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-4)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {FILTERS.map((f) => (
            <Tag
              key={f.key}
              selectable
              selected={filter === f.key}
              color={f.color}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Tag>
          ))}
        </div>
        <div style={{ position: 'relative', width: 260 }}>
          <Search
            size={17}
            strokeWidth={2}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-subtle)',
              pointerEvents: 'none',
            }}
          />
          <Input
            type="search"
            placeholder="Search transactions"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
      </div>

      <Card padding="none">
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={th}>Transaction</th>
              <th style={th}>Account</th>
              <th style={th}>Date</th>
              <th style={th}>Status</th>
              <th style={{ ...th, textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: 'var(--space-6)',
                    textAlign: 'center',
                    color: 'var(--text-subtle)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  No transactions match. Try a different filter, or add one.
                </td>
              </tr>
            ) : (
              visible.map((t) => {
                const badge = STATUS_BADGE[t.status];
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px var(--space-4)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
                        <CategoryIcon category={t.category} size="sm" />
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 'var(--text-sm)',
                              fontWeight: 'var(--weight-semibold)',
                              color: 'var(--text-strong)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {t.title}
                          </div>
                          {t.merchant ? (
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                              {t.merchant}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '12px var(--space-4)',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {accountLabel(t)}
                    </td>
                    <td
                      style={{
                        padding: '12px var(--space-4)',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {new Date(t.occurredAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td style={{ padding: '12px var(--space-4)' }}>
                      <Badge tone={badge.tone} size="sm">
                        {badge.label}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px var(--space-4)', textAlign: 'right' }}>
                      <MoneyAmount amount={t.amount} currency={t.currency} size="sm" color="auto" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
