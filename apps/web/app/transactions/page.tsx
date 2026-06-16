import { listTransactions, listAccounts, type Transaction, type Account } from '@/lib/resources';
import { safe } from '@/lib/safe';
import { PageHeader } from '@/components/layout/page-header';
import { Notice } from '@/components/feedback/notice';
import { TransactionsView } from '@/features/transactions/components/transactions-view';

export default async function TransactionsPage() {
  const [tx, accts] = await Promise.all([
    safe(() => listTransactions(), { items: [] as Transaction[], nextCursor: null }),
    safe(() => listAccounts(), [] as Account[]),
  ]);

  const count = tx.data.items.length;

  return (
    <>
      <PageHeader
        eyebrow="Activity"
        title="Transactions"
        subtitle={`${count} ${count === 1 ? 'transaction' : 'transactions'} this month`}
      />

      <div>
        {tx.error ? (
          <Notice tone="warn">
            The API is not reachable yet, so this list is empty. Start the API (apps/api) and seed
            the database to see live transactions.
          </Notice>
        ) : null}

        <TransactionsView transactions={tx.data.items} accounts={accts.data} />
      </div>
    </>
  );
}
