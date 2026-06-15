import { Users } from 'lucide-react';
import { Card, Avatar, MoneyAmount, Badge, EmptyState } from '@spendlio/ui';
import { listPeople, getBalances, type Person, type Balance } from '../../lib/resources';
import { safe } from '../../lib/safe';
import { PageHeader } from '../_components/PageHeader';
import { Notice } from '../_components/Notice';
import { SettleUpForm } from './SettleUpForm';

export default async function SplitPage() {
  const [people, balances] = await Promise.all([
    safe(() => listPeople(), [] as Person[]),
    safe(() => getBalances(), [] as Balance[]),
  ]);

  const byPerson = new Map(people.data.map((p) => [p.id, p]));
  const unreachable = people.error || balances.error;

  // Net across everything (per currency) — the friendly running tally shown in
  // the People card header. Balances aren't summed across currencies.
  const netByCurrency = new Map<string, number>();
  for (const bal of balances.data) {
    netByCurrency.set(bal.currency, (netByCurrency.get(bal.currency) ?? 0) + bal.amount);
  }
  const netEntries = [...netByCurrency.entries()].filter(([, amount]) => amount !== 0);

  return (
    <>
      <PageHeader eyebrow="Shared" title="Split & settle" subtitle="Who owes whom, gently sorted." />

      <div style={{ maxWidth: 1160 }}>
        {unreachable ? (
          <Notice tone="warn">
            The API is not reachable yet. People and balances will appear once apps/api is running.
          </Notice>
        ) : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-4)',
            alignItems: 'start',
          }}
        >
          <Card
            title="People"
            padding="none"
            action={
              netEntries.length > 0 ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  {netEntries.map(([currency, amount]) => (
                    <MoneyAmount key={currency} amount={amount} currency={currency} size="sm" />
                  ))}
                </span>
              ) : undefined
            }
          >
            {balances.data.length === 0 ? (
              <div style={{ padding: 'var(--space-3) var(--space-5) var(--space-5)' }}>
                <EmptyState
                  icon={<Users />}
                  title="All settled up"
                  message="Split an expense to start tracking who owes whom."
                />
              </div>
            ) : (
              <div style={{ padding: '6px 16px 14px' }}>
                {balances.data.map((bal, i) => {
                  const person = byPerson.get(bal.personId);
                  const name = person?.name ?? 'Someone';
                  const theyOweYou = bal.amount > 0;
                  return (
                    <div
                      key={`${bal.personId}-${bal.currency}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        padding: '12px 0',
                        borderTop: i ? '1px solid var(--border-subtle)' : 'none',
                      }}
                    >
                      <Avatar name={name} src={person?.avatarUrl ?? undefined} size="md" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14.5,
                            fontWeight: 'var(--weight-semibold)',
                            color: 'var(--text-strong)',
                          }}
                        >
                          {name}
                        </div>
                        {person?.email ? (
                          <div
                            style={{
                              fontSize: 'var(--text-xs)',
                              color: 'var(--text-subtle)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {person.email}
                          </div>
                        ) : null}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <MoneyAmount amount={bal.amount} currency={bal.currency} size="sm" />
                        <div
                          style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--text-subtle)',
                            fontWeight: 'var(--weight-semibold)',
                          }}
                        >
                          {theyOweYou ? 'owes you' : 'you owe'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="Settle up">
            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: 'var(--text-sm)',
                margin: '0 0 var(--space-4)',
              }}
            >
              Record a payment between two people to clear what they owe — no fuss.
            </p>
            <SettleUpForm people={people.data.map((p) => ({ id: p.id, name: p.name }))} />

            {people.data.length > 0 ? (
              <div
                style={{
                  marginTop: 'var(--space-5)',
                  paddingTop: 'var(--space-4)',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  style={{
                    fontSize: 'var(--text-2xs)',
                    fontWeight: 'var(--weight-semibold)',
                    letterSpacing: 'var(--tracking-caps)',
                    textTransform: 'uppercase',
                    color: 'var(--text-subtle)',
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  Your people
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                  {people.data.map((p) => {
                    const settled = !balances.data.some((b) => b.personId === p.id && b.amount !== 0);
                    return (
                      <span
                        key={p.id}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
                      >
                        <Avatar name={p.name} src={p.avatarUrl ?? undefined} size="sm" />
                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>{p.name}</span>
                        {settled ? <Badge tone="positive" dot>Settled</Badge> : null}
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </>
  );
}
