import { listTransactions, listAccounts, type Transaction, type Account } from '../../lib/resources';
import { safe } from '../../lib/safe';
import { PageHeader } from '../_components/PageHeader';
import { Notice } from '../_components/Notice';
import { TransactionsView } from './TransactionsView';

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

      <div style={{ maxWidth: 1160 }}>
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
