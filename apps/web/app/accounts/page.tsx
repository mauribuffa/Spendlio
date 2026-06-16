import { getAccountBalances, type AccountBalance } from '@/lib/resources';
import { safe } from '@/lib/safe';
import { PageHeader } from '@/components/layout/page-header';
import { Notice } from '@/components/feedback/notice';
import { AccountsTabs, AddAccountButton } from '@/features/accounts/components/accounts-tabs';

export default async function AccountsPage() {
  const { data, error } = await safe<AccountBalance[]>(() => getAccountBalances(), []);

  const currencyCount = new Set(data.map((b) => b.currency)).size;
  const subtitle =
    data.length > 0
      ? `${data.length} ${data.length === 1 ? 'account' : 'accounts'} · ${currencyCount} ${
          currencyCount === 1 ? 'currency' : 'currencies'
        }`
      : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Money"
        title="Accounts"
        subtitle={subtitle}
        action={<AddAccountButton />}
      />

      <div style={{ maxWidth: 1160 }}>
        {error ? (
          <Notice tone="warn">
            The API is not reachable yet, so balances are empty. Start the API (apps/api) and seed the
            database to see live account balances.
          </Notice>
        ) : null}

        <AccountsTabs balances={data} />
      </div>
    </>
  );
}
