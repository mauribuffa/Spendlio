import { UserPlus } from 'lucide-react';
import { Card, Avatar, Badge, MoneyAmount, EmptyState } from '@spendlio/ui';
import { listPeople, getBalances, type Person, type Balance } from '@/lib/resources';
import { safe } from '@/lib/safe';
import { PageHeader } from '@/components/layout/page-header';
import { Notice } from '@/components/feedback/notice';
import { AddPersonForm } from '@/features/people/components/add-person-form';

export default async function PeoplePage() {
  const [people, balances] = await Promise.all([
    safe(() => listPeople(), [] as Person[]),
    safe(() => getBalances(), [] as Balance[]),
  ]);

  const unreachable = people.error || balances.error;

  // Group balances by person id (a person can owe / be owed in several currencies).
  const balancesByPerson = new Map<string, Balance[]>();
  for (const bal of balances.data) {
    const list = balancesByPerson.get(bal.personId) ?? [];
    list.push(bal);
    balancesByPerson.set(bal.personId, list);
  }

  return (
    <div>
      <PageHeader eyebrow="Shared" title="People" />

      {unreachable ? (
        <Notice tone="warn">
          The API is not reachable yet. People and balances will appear once apps/api is running.
        </Notice>
      ) : null}

      <AddPersonForm />

      {people.data.length === 0 ? (
        <Card>
          <EmptyState
            icon={<UserPlus />}
            title="No people yet"
            message="Add the friends or roommates you split bills with to start tracking who owes whom."
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {people.data.map((p) => {
            const personBalances = balancesByPerson.get(p.id) ?? [];
            return (
              <Card key={p.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <Avatar name={p.name} src={p.avatarUrl ?? undefined} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 'var(--weight-semibold)' }}>{p.name}</div>
                    {p.email ? (
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-subtle)' }}>{p.email}</div>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-2)' }}>
                    {personBalances.length === 0 ? (
                      <Badge tone="neutral">Settled up</Badge>
                    ) : (
                      personBalances.map((bal) => {
                        const theyOweYou = bal.amount > 0;
                        return (
                          <div
                            key={`${bal.personId}-${bal.currency}`}
                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                          >
                            <Badge tone={theyOweYou ? 'positive' : 'negative'}>
                              {theyOweYou ? 'owes you' : 'you owe'}
                            </Badge>
                            <MoneyAmount amount={bal.amount} currency={bal.currency} />
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
