import { Card, TransactionRow } from '@spendlio/ui';
import { listTransactions, type Transaction } from '../../lib/resources';
import { safe } from '../../lib/safe';
import { PageHeader } from '../_components/PageHeader';
import { Notice } from '../_components/Notice';
import { AddTransactionForm } from './AddTransactionForm';

export default async function TransactionsPage() {
  const { data, error } = await safe(
    () => listTransactions(),
    { items: [] as Transaction[], nextCursor: null },
  );

  return (
    <div>
      <PageHeader eyebrow="Activity" title="Transactions" />

      {error ? (
        <Notice tone="warn">
          The API is not reachable yet, so this list is empty. Start the API (apps/api) and seed the
          database to see live transactions.
        </Notice>
      ) : null}

      <AddTransactionForm />

      <Card padding="sm">
        {data.items.length === 0 ? (
          <p style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-ink-subtle)' }}>
            No transactions yet. Add your first one above.
          </p>
        ) : (
          <div>
            {data.items.map((item) => (
              <TransactionRow
                key={item.id}
                category={item.category}
                title={item.title}
                merchant={item.merchant ?? undefined}
                amount={item.amount}
                currency={item.currency}
                meta={new Date(item.occurredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
