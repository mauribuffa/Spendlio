import Link from 'next/link';
import { Wallet, ArrowUpRight, ArrowDownLeft, PiggyBank, Sparkles, ArrowRight } from 'lucide-react';
import { Card, MoneyAmount, TransactionRow, ProgressBar, formatSignedMoney, formatWhole, categoryColor, cn } from '@spendlio/ui';
import { listTransactions, getBudgetStatus, type Transaction, type BudgetStatus } from '@/lib/resources';
import { safe } from '@/lib/safe';
import { PageHeader } from '@/components/layout/PageHeader';
import { Notice } from '@/components/feedback/Notice';
import { Donut } from '@/components/domain/charts';

function totals(items: Transaction[]) {
  let income = 0;
  let expense = 0;
  const byCategory = new Map<string, number>();
  for (const item of items) {
    if (item.amount >= 0) income += item.amount;
    else {
      expense += -item.amount;
      byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + -item.amount);
    }
  }
  const currency = items[0]?.currency ?? 'USD';
  const categories = [...byCategory.entries()]
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value);
  return { income, expense, net: income - expense, currency, categories };
}

export default async function OverviewPage() {
  const [tx, budgets] = await Promise.all([
    safe(() => listTransactions(), { items: [] as Transaction[], nextCursor: null }),
    safe(() => getBudgetStatus(), [] as BudgetStatus[]),
  ]);

  const t = totals(tx.data.items);
  const recent = tx.data.items.slice(0, 6);
  const unreachable = tx.error || budgets.error;
  const onDark = { color: 'var(--green-200)' };

  return (
    <>
      <PageHeader eyebrow="This month" title="Overview" />

      {unreachable ? (
        <Notice tone="warn">
          The API is not reachable yet. Figures show zero until apps/api is running and seeded.
        </Notice>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1160 }}>
        {/* Balance hero + recap */}
        <div className={cn('spl-grid-asym')} style={{ '--spl-cols': '1.7fr 1fr', '--spl-gap': '18px', alignItems: 'stretch' }}>
          <Card variant="inverse" style={{ borderRadius: 'var(--radius-2xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', color: 'var(--green-200)', textTransform: 'uppercase' }}>
                  Net this month · {t.currency}
                </div>
                <div
                  data-money
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 44, letterSpacing: '-0.02em', color: '#fff', marginTop: 8, lineHeight: 1 }}
                >
                  {formatSignedMoney(t.net, t.currency)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, ...onDark, fontSize: 12 }}>
                  Income minus spending across your transactions
                </div>
              </div>
              <span style={{ width: 40, height: 40, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.12)', color: '#fff', flex: 'none' }}>
                <Wallet size={20} strokeWidth={2} aria-hidden="true" />
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
              {[
                { icon: ArrowUpRight, label: 'Spent', value: formatWhole(t.expense, t.currency) },
                { icon: ArrowDownLeft, label: 'Income', value: formatWhole(t.income, t.currency) },
                { icon: PiggyBank, label: 'Saved', value: formatWhole(Math.max(0, t.net), t.currency) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius-lg)', padding: '13px 15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...onDark, fontSize: 12, fontWeight: 600 }}>
                    <Icon size={14} strokeWidth={2} aria-hidden="true" /> {label}
                  </div>
                  <div data-money style={{ color: '#fff', fontWeight: 700, fontSize: 19, marginTop: 4, fontFamily: 'var(--font-display)' }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Link href="/recap" style={{ display: 'block' }}>
            <Card variant="brand" interactive style={{ borderColor: 'var(--green-200)', borderRadius: 'var(--radius-2xl)', height: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--green-600)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    <Sparkles size={19} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--green-900)' }}>Your monthly recap</span>
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--green-800)', lineHeight: 1.5, flex: 1 }}>
                  See where your money went and how this month compares.
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--green-700)', fontSize: 13, fontWeight: 600 }}>
                  View recap <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Categories donut + budgets */}
        <div className={cn('spl-grid-asym')} style={{ '--spl-cols': '1fr 1.7fr', '--spl-gap': '18px', alignItems: 'start' }}>
          <Card title="Categories" padding="lg">
            {t.categories.length === 0 ? (
              <p style={{ color: 'var(--text-subtle)', fontSize: 'var(--text-sm)' }}>No spending yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <Donut
                  data={t.categories.slice(0, 6).map((c) => ({ value: c.value, color: categoryColor(c.category) }))}
                  centerLabel="Spent"
                  centerValue={formatWhole(t.expense, t.currency)}
                />
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {t.categories.slice(0, 4).map((c) => (
                    <div key={c.category} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: categoryColor(c.category), flex: 'none' }} />
                      <span style={{ flex: 1, color: 'var(--text-body)', fontWeight: 500, textTransform: 'capitalize' }}>{c.category}</span>
                      <MoneyAmount amount={-c.value} currency={t.currency} color="off" size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card title="Budgets" padding="lg">
            {budgets.data.length === 0 ? (
              <p style={{ color: 'var(--text-subtle)', fontSize: 'var(--text-sm)' }}>No budgets set.</p>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {budgets.data.map((b) => (
                  <div key={b.category} style={{ display: 'grid', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, fontSize: 13 }}>
                      <span style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--text-body)', textTransform: 'capitalize' }}>{b.category}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
                        {formatWhole(b.spent, b.currency)} <span style={{ color: 'var(--text-subtle)' }}>/ {formatWhole(b.limit, b.currency)}</span>
                      </span>
                    </div>
                    <ProgressBar value={b.spent} max={b.limit} label={`${b.category} budget usage`} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Recent transactions */}
        <Card
          title="Recent transactions"
          padding="none"
          action={
            <Link href="/transactions" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-brand)' }}>
              View all
            </Link>
          }
        >
          {recent.length === 0 ? (
            <p style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-subtle)' }}>
              No transactions yet.
            </p>
          ) : (
            <div style={{ padding: '6px 16px' }}>
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
      </div>
    </>
  );
}
