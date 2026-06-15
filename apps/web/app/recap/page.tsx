import { Card, Stat, MoneyAmount, CategoryIcon, ProgressBar, EmptyState } from '@spendlio/ui';
import { CalendarRange } from 'lucide-react';
import { getRecap, type MonthlySummary } from '../../lib/resources';
import { safe } from '../../lib/safe';
import { PageHeader } from '../_components/PageHeader';
import { Notice } from '../_components/Notice';
import { MonthPicker } from './MonthPicker';
import { recentMonths, percentOfTotal } from './recap-utils';

/** Current calendar month as YYYY-MM (UTC, matching the rest of the app). */
function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

const MONTH_COUNT = 12;

export default async function RecapPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? currentMonth();
  const months = recentMonths(currentMonth(), MONTH_COUNT);

  // 404 (recap not built yet) and an unreachable API both land in `error`; we
  // distinguish them only in copy below — either way `data` is null.
  const { data, error } = await safe<MonthlySummary | null>(() => getRecap(month), null);

  // Share-of-total uses the sum of category amounts (each is positive minor
  // units of spend in the summary currency), not totalExpense, so the bars sum
  // to ~100% even if totalExpense includes uncategorised spend.
  const categoryTotal = data ? data.byCategory.reduce((sum, c) => sum + c.amount, 0) : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Monthly recap"
        title="Recap"
        action={<MonthPicker months={months} value={month} />}
      />

      {error && data === null && month === currentMonth() ? (
        <Notice tone="warn">
          The API is not reachable yet, so this recap is empty. Start the API (apps/api) and seed the
          database to see your monthly recap.
        </Notice>
      ) : null}

      {data ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--space-4)',
              marginBottom: 'var(--space-6)',
            }}
          >
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

          {data.topMerchant ? (
            <Card style={{ marginBottom: 'var(--space-6)' }}>
              <Stat label="Top merchant" value={data.topMerchant} />
            </Card>
          ) : null}

          {data.byCategory.length > 0 ? (
            <Card style={{ marginBottom: 'var(--space-6)' }}>
              <h2 style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-display)', marginBottom: 'var(--space-4)' }}>
                Spending by category
              </h2>
              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                {data.byCategory.map((c) => {
                  const pct = percentOfTotal(c.amount, categoryTotal);
                  return (
                    <div key={c.category} style={{ display: 'grid', gap: 'var(--space-2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <CategoryIcon category={c.category} size="sm" />
                        <span style={{ flex: 1, textTransform: 'capitalize', fontSize: 'var(--text-sm)' }}>
                          {c.category}
                        </span>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-subtle)' }}>{pct}%</span>
                        <MoneyAmount amount={-c.amount} currency={data.currency} size="sm" color="off" />
                      </div>
                      <ProgressBar value={pct} max={100} />
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon={<CalendarRange />}
          title="Recap not ready yet"
          message="This month's recap hasn't been built. It's generated automatically once there's activity to summarize — check back soon."
        />
      )}
    </div>
  );
}
