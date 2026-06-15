import { Plus } from 'lucide-react';
import { Card, MoneyAmount, ProgressBar, Badge, CategoryIcon, EmptyState } from '@spendlio/ui';
import { getCurrencyDecimals } from '@spendlio/contracts';
import { getBudgetStatus, type BudgetStatus } from '../../lib/resources';
import { safe } from '../../lib/safe';
import { PageHeader } from '../_components/PageHeader';
import { Notice } from '../_components/Notice';
import { Donut } from '../_components/charts';

/** --cat ramp slot per category — mirrors @spendlio/ui CategoryIcon. */
const CAT_SLOT: Record<string, number> = {
  groceries: 1, dining: 2, transport: 3, housing: 4, utilities: 6, shopping: 5,
  health: 4, entertainment: 5, travel: 3, subscriptions: 7, income: 1, transfer: 8,
};
const catColor = (c: string) => `var(--cat-${CAT_SLOT[c] ?? 8})`;

/** Whole-currency formatter for compact figures (no sign, no cents). */
function whole(cents: number, currency: string): string {
  const d = getCurrencyDecimals(currency);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
    Math.abs(cents) / 10 ** d,
  );
}

export default async function BudgetsPage() {
  const { data, error } = await safe(() => getBudgetStatus(), [] as BudgetStatus[]);

  const currency = data[0]?.currency ?? 'USD';
  const totalSpent = data.reduce((s, b) => s + b.spent, 0);
  const totalLimit = data.reduce((s, b) => s + b.limit, 0);
  const pct = totalLimit > 0 ? Math.min(100, (totalSpent / totalLimit) * 100) : 0;

  return (
    <>
      <PageHeader
        eyebrow="Limits"
        title="Budgets"
        subtitle="Track monthly spending against the limits you set."
      />

      {error ? (
        <Notice tone="warn">
          The API is not reachable yet. Budget status will appear once apps/api is running.
        </Notice>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1160 }}>
        {data.length === 0 ? (
          <Card padding="lg">
            <EmptyState
              icon={<Plus size={22} strokeWidth={2} aria-hidden="true" />}
              title="No budgets yet"
              message="Once you set monthly limits, you will see how much is left for each category here."
            />
          </Card>
        ) : (
          <>
            {/* Total budget hero — spend ring + figures + overall bar */}
            <Card variant="inverse" style={{ borderRadius: 'var(--radius-2xl)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
                <Donut
                  size={148}
                  thickness={22}
                  data={[
                    { value: totalSpent, color: 'var(--green-300)' },
                    { value: Math.max(0, totalLimit - totalSpent), color: 'rgba(255,255,255,0.16)' },
                  ]}
                />
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', color: 'var(--green-200)', textTransform: 'uppercase' }}>
                    This month · {currency}
                  </div>
                  <div
                    data-money
                    style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 38, letterSpacing: '-0.02em', color: '#fff', marginTop: 8, lineHeight: 1 }}
                  >
                    {whole(totalSpent, currency)}{' '}
                    <span style={{ color: 'var(--green-200)', fontSize: 22, fontWeight: 500 }}>
                      / {whole(totalLimit, currency)}
                    </span>
                  </div>
                  <div style={{ marginTop: 18, height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.16)' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: 'var(--green-300)' }} />
                  </div>
                  <div style={{ marginTop: 10, fontSize: 13, color: 'var(--green-200)' }}>
                    {whole(Math.max(0, totalLimit - totalSpent), currency)} left across {data.length}{' '}
                    {data.length === 1 ? 'budget' : 'budgets'}
                  </div>
                </div>
              </div>
            </Card>

            {/* Per-category budgets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, alignItems: 'start' }}>
              {data.map((b) => {
                const over = b.remaining < 0;
                return (
                  <Card key={b.category} padding="lg">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <CategoryIcon category={b.category} size="md" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-strong)', fontFamily: 'var(--font-display)', textTransform: 'capitalize' }}>
                          {b.category}
                        </div>
                        <div style={{ fontSize: 12.5, color: over ? 'var(--text-strong)' : 'var(--text-muted)' }}>
                          {over ? 'Over by ' : ''}
                          <span data-money>{whole(b.remaining, b.currency)}</span>
                          {over ? '' : ' left'}
                        </div>
                      </div>
                      {over ? <Badge tone="negative">Over</Badge> : null}
                    </div>

                    <ProgressBar value={b.spent} max={b.limit} label={`${b.category} budget usage`} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-muted)' }}>
                        <span style={{ width: 9, height: 9, borderRadius: 3, background: catColor(b.category), flex: 'none' }} />
                        Spent
                      </span>
                      <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                        <span data-money style={{ color: 'var(--text-body)', fontWeight: 600 }}>{whole(b.spent, b.currency)}</span>
                        {' '}/ {whole(b.limit, b.currency)}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
