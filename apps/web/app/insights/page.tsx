import { Card, Stat, MoneyAmount, CategoryIcon } from '@spendlio/ui';
import { getRecap, type MonthlySummary } from '../../lib/resources';
import { safe } from '../../lib/safe';
import { PageHeader } from '../_components/PageHeader';
import { Notice } from '../_components/Notice';
import { Assistant } from './Assistant';

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

export default async function InsightsPage() {
  const month = currentMonth();
  const { data, error } = await safe<MonthlySummary | null>(() => getRecap(month), null);

  return (
    <div>
      <PageHeader eyebrow="Insights" title="Insights & assistant" />

      {error ? (
        <Notice tone="warn">
          The API is not reachable yet, so the recap is empty. The assistant also needs the API
          running to answer from your data.
        </Notice>
      ) : null}

      {data ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <Card>
              <Stat label="Income" value={<MoneyAmount amount={data.totalIncome} currency={data.currency} size="lg" color="off" />} />
            </Card>
            <Card>
              <Stat label="Expense" value={<MoneyAmount amount={-data.totalExpense} currency={data.currency} size="lg" color="off" />} />
            </Card>
            <Card>
              <Stat label="Net" value={<MoneyAmount amount={data.net} currency={data.currency} size="lg" />} />
            </Card>
          </div>

          {data.byCategory.length > 0 ? (
            <Card style={{ marginBottom: 'var(--space-6)' }}>
              <h2 style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-display)', marginBottom: 'var(--space-4)' }}>
                Spending by category
              </h2>
              <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                {data.byCategory.map((c) => (
                  <div key={c.category} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <CategoryIcon category={c.category} size="sm" />
                    <span style={{ flex: 1, textTransform: 'capitalize', fontSize: 'var(--text-sm)' }}>{c.category}</span>
                    <MoneyAmount amount={-c.amount} currency={data.currency} size="sm" color="off" />
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </>
      ) : null}

      <Assistant />
    </div>
  );
}
