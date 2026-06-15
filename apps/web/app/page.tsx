import { Card, Stat, MoneyAmount, TransactionRow, ProgressBar } from '@spendlio/ui';
import { listTransactions, getBudgetStatus, type Transaction, type BudgetStatus } from '../lib/resources';
import { safe } from '../lib/safe';
import { PageHeader } from './_components/PageHeader';
import { Notice } from './_components/Notice';

/** Sum of expense (negative) amounts as a positive cents number, by currency major. */
function totals(items: Transaction[]) {
  let income = 0;
  let expense = 0;
  for (const item of items) {
    if (item.amount >= 0) income += item.amount;
    else expense += -item.amount;
  }
  // Assumes a single display currency for the demo; FX-aware totals come later.
  const currency = items[0]?.currency ?? 'USD';
  return { income, expense, net: income - expense, currency };
}

export default async function OverviewPage() {
  const [tx, budgets] = await Promise.all([
    safe(() => listTransactions(), { items: [] as Transaction[], nextCursor: null }),
    safe(() => getBudgetStatus(), [] as BudgetStatus[]),
  ]);

  const t = totals(tx.data.items);
  const recent = tx.data.items.slice(0, 5);
  const unreachable = tx.error || budgets.error;

  return (
    <div>
      <PageHeader eyebrow="This month" title="Overview" />

      {unreachable ? (
        <Notice tone="warn">
          The API is not reachable yet. Figures show zero until apps/api is running and seeded.
        </Notice>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <Card>
          <Stat label="Spent" value={<MoneyAmount amount={-t.expense} currency={t.currency} size="lg" color="off" />} />
        </Card>
        <Card>
          <Stat label="Income" value={<MoneyAmount amount={t.income} currency={t.currency} size="lg" color="off" />} />
        </Card>
        <Card>
          <Stat label="Net" value={<MoneyAmount amount={t.net} currency={t.currency} size="lg" />} />
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        <Card padding="sm">
          <h2 style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-display)', padding: 'var(--space-3) var(--space-3) 0' }}>
            Recent activity
          </h2>
          {recent.length === 0 ? (
            <p style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-ink-subtle)' }}>
              No transactions yet.
            </p>
          ) : (
            <div style={{ padding: '0 var(--space-3)' }}>
              {recent.map((item) => (
                <TransactionRow
                  key={item.id}
                  category={item.category}
                  title={item.title}
                  merchant={item.merchant ?? undefined}
                  amount={item.amount}
                  currency={item.currency}
                />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-display)', marginBottom: 'var(--space-4)' }}>
            Budgets
          </h2>
          {budgets.data.length === 0 ? (
            <p style={{ color: 'var(--color-ink-subtle)', fontSize: 'var(--text-sm)' }}>No budgets set.</p>
          ) : (
            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
              {budgets.data.map((b) => (
                <div key={b.category} style={{ display: 'grid', gap: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                    <span style={{ textTransform: 'capitalize' }}>{b.category}</span>
                    <MoneyAmount amount={-b.spent} currency={b.currency} size="sm" color="off" />
                  </div>
                  <ProgressBar value={b.spent} max={b.limit} label={`${b.category} budget usage`} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
