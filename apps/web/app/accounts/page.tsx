import { getAccountBalances, type AccountBalance } from '../../lib/resources';
import { safe } from '../../lib/safe';
import { PageHeader } from '../_components/PageHeader';
import { Notice } from '../_components/Notice';
import { AccountsTabs } from './AccountsTabs';

export default async function AccountsPage() {
  const { data, error } = await safe<AccountBalance[]>(() => getAccountBalances(), []);

  return (
    <div>
      <PageHeader eyebrow="Money" title="Accounts" />

      {error ? (
        <Notice tone="warn">
          The API is not reachable yet, so balances are empty. Start the API (apps/api) and seed the
          database to see live account balances.
        </Notice>
      ) : null}

      <AccountsTabs balances={data} />
    </div>
  );
}
