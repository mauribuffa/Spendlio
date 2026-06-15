import { Card, MoneyAmount, ProgressBar, Badge, CategoryIcon } from '@spendlio/ui';
import { getBudgetStatus, type BudgetStatus } from '../../lib/resources';
import { safe } from '../../lib/safe';
import { PageHeader } from '../_components/PageHeader';
import { Notice } from '../_components/Notice';

export default async function BudgetsPage() {
  const { data, error } = await safe(() => getBudgetStatus(), [] as BudgetStatus[]);

  return (
    <div>
      <PageHeader eyebrow="Limits" title="Budgets" />

      {error ? (
        <Notice tone="warn">
          The API is not reachable yet. Budget status will appear once apps/api is running.
        </Notice>
      ) : null}

      {data.length === 0 ? (
        <Card padding="lg">
          <p style={{ textAlign: 'center', color: 'var(--text-subtle)' }}>
            No budgets yet. Once you set monthly limits, you will see how much is left here.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {data.map((b) => {
            const over = b.remaining < 0;
            return (
              <Card key={b.category}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                  <CategoryIcon category={b.category} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span style={{ fontWeight: 'var(--weight-semibold)', textTransform: 'capitalize' }}>
                        {b.category}
                      </span>
                      {over ? <Badge tone="negative">Over budget</Badge> : null}
                    </div>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                      {b.period}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <MoneyAmount amount={b.remaining} currency={b.currency} size="md" />
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-subtle)' }}>
                      left of{' '}
                      <span data-money>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: b.currency }).format(
                          b.limit / 100,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <ProgressBar value={b.spent} max={b.limit} label={`${b.category} budget usage`} />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
