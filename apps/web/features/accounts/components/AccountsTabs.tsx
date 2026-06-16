'use client';

import { useMemo, useState } from 'react';
import { Card, SegmentedControl, MoneyAmount, EmptyState, Button, cn } from '@spendlio/ui';
import { CreditCard, PiggyBank, Wallet, Landmark, Plus, Info } from 'lucide-react';
import type { ComponentType } from 'react';
import type { AccountBalance } from '@/lib/resources';

/** Primary action rendered in the page topbar. Presentation-only. */
export function AddAccountButton() {
  return (
    <Button variant="primary" leadingIcon={<Plus size={17} strokeWidth={2} aria-hidden="true" />}>
      Add account
    </Button>
  );
}

const TYPE_ICON: Record<AccountBalance['type'], ComponentType<{ size?: number; strokeWidth?: number }>> = {
  card: CreditCard,
  savings: PiggyBank,
  cash: Wallet,
  checking: Landmark,
};

function AccountCard({ b }: { b: AccountBalance }) {
  const Icon = TYPE_ICON[b.type] ?? Wallet;
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <span
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--surface-sunken)',
            color: 'var(--text-muted)',
          }}
        >
          <Icon size={22} strokeWidth={2} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--weight-bold)',
              color: 'var(--text-strong)',
            }}
          >
            {b.name}
          </div>
          <div
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-muted)',
              textTransform: 'capitalize',
            }}
          >
            {b.type}
            {b.last4 ? ` ·· ${b.last4}` : ''} · {b.currency}
          </div>
        </div>
        <MoneyAmount amount={b.balance} currency={b.currency} size="lg" color="off" />
      </div>
    </Card>
  );
}

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

  // Total in base currency: sum of per-account base-converted balances, skipping
  // any account whose rate is unavailable (baseBalance === null).
  const totalBase = balances.reduce((sum, b) => sum + (b.baseBalance ?? 0), 0);
  const rateAsOf = balances.find((b) => b.rateAsOf != null)?.rateAsOf ?? null;

  // Per-currency exact subtotals (native minor units).
  const subtotals = currencies.map((c) => ({
    currency: c,
    total: balances.filter((b) => b.currency === c).reduce((sum, b) => sum + b.balance, 0),
  }));

  const tabTotal = visible.reduce((sum, b) => sum + b.balance, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <SegmentedControl
        options={options}
        value={tab}
        onChange={setTab}
        ariaLabel="Filter accounts by currency"
      />

      {isAll ? (
        <Card variant="inverse" style={{ borderRadius: 'var(--radius-2xl)' }}>
          <div
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--weight-semibold)',
              letterSpacing: 'var(--tracking-caps)',
              color: 'var(--green-200)',
              textTransform: 'uppercase',
            }}
          >
            Total balance · {baseCurrency}
          </div>
          <div style={{ marginTop: 6, lineHeight: 1 }}>
            <MoneyAmount
              amount={totalBase}
              currency={baseCurrency}
              size="xl"
              color="off"
              style={{ color: '#fff' }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 10,
              color: 'var(--green-200)',
              fontSize: 'var(--text-xs)',
            }}
          >
            <Info size={13} strokeWidth={2} aria-hidden="true" />
            {rateAsOf ? `Approx · converted as of ${rateAsOf}` : 'Approx · converted at latest rates'}
          </div>
          {subtotals.length > 1 ? (
            <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
              {subtotals.map((s) => (
                <div
                  key={s.currency}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '12px 15px',
                  }}
                >
                  <div
                    style={{
                      color: 'var(--green-200)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--weight-semibold)',
                    }}
                  >
                    {s.currency} · exact
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <MoneyAmount
                      amount={s.total}
                      currency={s.currency}
                      size="md"
                      color="off"
                      style={{ color: '#fff' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      ) : (
        <Card variant="brand" style={{ borderColor: 'var(--green-200)', borderRadius: 'var(--radius-2xl)' }}>
          <div
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--green-800)',
              fontWeight: 'var(--weight-semibold)',
            }}
          >
            {tab} balance · exact
          </div>
          <div style={{ marginTop: 4 }}>
            <MoneyAmount
              amount={tabTotal}
              currency={tab}
              size="xl"
              color="off"
              style={{ color: 'var(--green-900)' }}
            />
          </div>
        </Card>
      )}

      <div className={cn('spl-cards')} style={{ '--spl-gap': '14px', '--spl-min': '260px' }}>
        {visible.map((b) => (
          <AccountCard key={b.accountId} b={b} />
        ))}
      </div>
    </div>
  );
}
