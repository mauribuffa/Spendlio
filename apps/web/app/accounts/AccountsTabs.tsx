'use client';

import { useMemo, useState } from 'react';
import { Card, SegmentedControl, MoneyAmount, EmptyState } from '@spendlio/ui';
import { Landmark } from 'lucide-react';
import type { AccountBalance } from '../../lib/resources';

export function AccountsTabs({ balances }: { balances: AccountBalance[] }) {
  // Distinct account currencies, in first-seen order, plus an "All" rollup tab.
  const currencies = useMemo(() => {
    const seen: string[] = [];
    for (const b of balances) if (!seen.includes(b.currency)) seen.push(b.currency);
    return seen;
  }, [balances]);

  const baseCurrency = balances[0]?.baseCurrency ?? 'USD';

  const options = useMemo(
    () => [{ value: 'all', label: 'All' }, ...currencies.map((c) => ({ value: c, label: c }))],
    [currencies],
  );

  const [tab, setTab] = useState<string>('all');

  if (balances.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Landmark />}
          title="No accounts yet"
          message="Add a bank, card, or cash account to start tracking balances across currencies."
        />
      </Card>
    );
  }

  const isAll = tab === 'all';
  const visible = isAll ? balances : balances.filter((b) => b.currency === tab);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <SegmentedControl
        options={options}
        value={tab}
        onChange={setTab}
        ariaLabel="Filter accounts by currency"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {visible.map((b) => {
          // In an "All" view we show the base-converted rollup value (approximate);
          // in a per-currency tab we show the native balance.
          const showBase = isAll;
          const amount = showBase ? b.baseBalance : b.balance;
          const currency = showBase ? b.baseCurrency : b.currency;

          return (
            <Card key={b.accountId}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-4)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-ink)' }}>
                    {b.name}
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-ink-muted)',
                      display: 'flex',
                      gap: 'var(--space-2)',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ textTransform: 'capitalize' }}>{b.type}</span>
                    {b.last4 ? (
                      <span style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
                        ···· {b.last4}
                      </span>
                    ) : null}
                  </span>
                </div>

                {amount === null ? (
                  <span
                    title="Conversion rate unavailable"
                    style={{ color: 'var(--color-ink-subtle)', fontFamily: 'var(--font-display)' }}
                  >
                    —
                  </span>
                ) : (
                  <MoneyAmount amount={amount} currency={currency} size="lg" color="auto" />
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {isAll ? (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)' }}>
          Converted to {baseCurrency} using the latest available rates — values are approximate.
        </p>
      ) : null}
    </div>
  );
}
