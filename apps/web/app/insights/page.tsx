import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp, AlertTriangle, Repeat, PiggyBank } from 'lucide-react';
import { Card, MoneyAmount } from '@spendlio/ui';
import { getCurrencyDecimals } from '@spendlio/contracts';
import { listTransactions, getBudgetStatus, type Transaction, type BudgetStatus } from '../../lib/resources';
import { safe } from '../../lib/safe';
import { PageHeader } from '../_components/PageHeader';
import { Notice } from '../_components/Notice';
import { Donut } from '../_components/charts';

const CAT_SLOT: Record<string, number> = {
  groceries: 1, dining: 2, transport: 3, housing: 4, utilities: 6, shopping: 5,
  health: 4, entertainment: 5, travel: 3, subscriptions: 7, income: 1, transfer: 8,
};
const catColor = (c: string) => `var(--cat-${CAT_SLOT[c] ?? 8})`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function whole(cents: number, currency: string): string {
  const d = getCurrencyDecimals(currency);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
    Math.abs(cents) / 10 ** d,
  );
}

interface Insight {
  icon: ReactNode;
  tint: string;
  title: string;
  body: ReactNode;
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <Card padding="lg">
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: 'var(--radius-md)',
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `color-mix(in srgb, ${insight.tint} 14%, var(--surface-card))`,
            color: insight.tint,
          }}
        >
          {insight.icon}
        </span>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-bold)', fontSize: 16, color: 'var(--text-strong)' }}>
            {insight.title}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{insight.body}</div>
        </div>
      </div>
    </Card>
  );
}

export default async function InsightsPage() {
  const [tx, budgets] = await Promise.all([
    safe(() => listTransactions(), { items: [] as Transaction[], nextCursor: null }),
    safe(() => getBudgetStatus(), [] as BudgetStatus[]),
  ]);
  const unreachable = tx.error || budgets.error;

  const items = tx.data.items;
  const currency = items[0]?.currency ?? 'USD';
  const byCategory = new Map<string, number>();
  let expense = 0;
  let recurring = 0;
  for (const t of items) {
    if (t.status === 'recurring') recurring += 1;
    if (t.amount < 0) {
      expense += -t.amount;
      byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + -t.amount);
    }
  }
  const categories = [...byCategory.entries()].map(([category, value]) => ({ category, value })).sort((a, b) => b.value - a.value);
  const top = categories[0];
  const over = budgets.data.find((b) => b.spent > b.limit);
  const monthName = new Date().toLocaleString('en-US', { month: 'long' });

  const insights: Insight[] = [];
  if (top) {
    insights.push({
      icon: <TrendingUp size={18} strokeWidth={2} aria-hidden="true" />,
      tint: catColor(top.category),
      title: `${cap(top.category)} leads your spending`,
      body: (
        <>
          You&rsquo;ve spent <strong>{whole(top.value, currency)}</strong> on {top.category} so far this month — your largest category.
        </>
      ),
    });
  }
  insights.push(
    over
      ? {
          icon: <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" />,
          tint: 'var(--negative-500)',
          title: `${cap(over.category)} over budget`,
          body: (
            <>
              You&rsquo;re <strong>{whole(over.spent - over.limit, over.currency)}</strong> over your{' '}
              {whole(over.limit, over.currency)} {over.category} budget this month.
            </>
          ),
        }
      : {
          icon: <PiggyBank size={18} strokeWidth={2} aria-hidden="true" />,
          tint: 'var(--positive-500)',
          title: budgets.data.length > 0 ? 'All budgets on track' : 'No budgets yet',
          body:
            budgets.data.length > 0
              ? "You're within every budget you've set this month. Nice."
              : 'Set a category budget to see how your spending tracks against it.',
        },
  );
  insights.push({
    icon: recurring > 0 ? <Repeat size={18} strokeWidth={2} aria-hidden="true" /> : <TrendingDown size={18} strokeWidth={2} aria-hidden="true" />,
    tint: 'var(--info-500)',
    title: recurring > 0 ? `${recurring} recurring ${recurring === 1 ? 'charge' : 'charges'}` : 'No recurring charges',
    body:
      recurring > 0
        ? 'Subscriptions and recurring bills are part of this month — keep an eye on renewals.'
        : 'Nothing flagged as recurring this month.',
  });

  return (
    <>
      <PageHeader eyebrow="Insights" title="Insights" subtitle={`A summary of your ${monthName}`} hideActions />

      <div style={{ maxWidth: 1160 }}>
        {unreachable ? (
          <Notice tone="warn">The API is not reachable yet, so insights are empty. Start apps/api and seed the database.</Notice>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 18, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {insights.map((insight, i) => (
              <InsightCard key={i} insight={insight} />
            ))}
          </div>

          <Card title={`Where ${monthName} went`} padding="lg">
            {categories.length === 0 ? (
              <p style={{ color: 'var(--text-subtle)', fontSize: 'var(--text-sm)' }}>No spending yet.</p>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Donut
                  data={categories.slice(0, 8).map((c) => ({ value: c.value, color: catColor(c.category) }))}
                  centerLabel="Total"
                  centerValue={whole(expense, currency)}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 180, flex: 1 }}>
                  {categories.slice(0, 6).map((c) => (
                    <div key={c.category} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: catColor(c.category), flex: 'none' }} />
                      <span style={{ flex: 1, color: 'var(--text-body)', fontWeight: 500 }}>{cap(c.category)}</span>
                      <MoneyAmount amount={-c.value} currency={currency} color="off" size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
