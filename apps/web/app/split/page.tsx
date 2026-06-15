import { Card, Avatar, MoneyAmount, Badge } from '@spendlio/ui';
import { listPeople, getBalances, type Person, type Balance } from '../../lib/resources';
import { safe } from '../../lib/safe';
import { PageHeader } from '../_components/PageHeader';
import { Notice } from '../_components/Notice';

export default async function SplitPage() {
  const [people, balances] = await Promise.all([
    safe(() => listPeople(), [] as Person[]),
    safe(() => getBalances(), [] as Balance[]),
  ]);

  const byPerson = new Map(people.data.map((p) => [p.id, p]));
  const unreachable = people.error || balances.error;

  return (
    <div>
      <PageHeader eyebrow="Shared" title="Split" />

      {unreachable ? (
        <Notice tone="warn">
          The API is not reachable yet. People and balances will appear once apps/api is running.
        </Notice>
      ) : null}

      <Card style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-display)', marginBottom: 'var(--space-4)' }}>
          Balances
        </h2>
        {balances.data.length === 0 ? (
          <p style={{ color: 'var(--color-ink-subtle)', fontSize: 'var(--text-sm)' }}>
            You are all settled up. Split an expense to start tracking who owes whom.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {balances.data.map((bal) => {
              const person = byPerson.get(bal.personId);
              const name = person?.name ?? 'Someone';
              const theyOweYou = bal.amount > 0;
              return (
                <div
                  key={`${bal.personId}-${bal.currency}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}
                >
                  <Avatar name={name} src={person?.avatarUrl ?? undefined} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 'var(--weight-medium)' }}>{name}</span>{' '}
                    <Badge tone={theyOweYou ? 'positive' : 'negative'}>
                      {theyOweYou ? 'owes you' : 'you owe'}
                    </Badge>
                  </div>
                  <MoneyAmount amount={bal.amount} currency={bal.currency} />
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <h2 style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-display)', marginBottom: 'var(--space-4)' }}>
          People
        </h2>
        {people.data.length === 0 ? (
          <p style={{ color: 'var(--color-ink-subtle)', fontSize: 'var(--text-sm)' }}>
            No people yet. Add friends or roommates to split bills with them.
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
            {people.data.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Avatar name={p.name} src={p.avatarUrl ?? undefined} size="sm" />
                <span style={{ fontSize: 'var(--text-sm)' }}>{p.name}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
