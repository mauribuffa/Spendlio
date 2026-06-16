import { Users, FolderPlus } from 'lucide-react';
import {
  Card,
  Avatar,
  AvatarGroup,
  MoneyAmount,
  Badge,
  EmptyState,
  formatSignedMoney,
} from '@spendlio/ui';
import {
  listPeople,
  listGroups,
  getBalances,
  type Person,
  type Group,
  type Balance,
} from '@/lib/resources';
import { safe } from '@/lib/safe';
import { PageHeader } from '@/components/layout/PageHeader';
import { Notice } from '@/components/feedback/Notice';
import { SettleUpForm } from '@/features/split/components/SettleUpForm';
import { AddGroupForm } from '@/features/split/components/AddGroupForm';
import { RemindButton } from '@/features/split/components/RemindButton';

export default async function SplitPage() {
  const [people, groups, balances] = await Promise.all([
    safe(() => listPeople(), [] as Person[]),
    safe(() => listGroups(), [] as Group[]),
    safe(() => getBalances(), [] as Balance[]),
  ]);

  const byPerson = new Map(people.data.map((p) => [p.id, p]));
  const unreachable = people.error || balances.error || groups.error;

  // Net per person + their currency, from the balances (one row per person/currency).
  // The demo is single-currency; if a person carried multiple, amounts sum naively.
  const netByPerson = new Map<string, number>();
  const currencyByPerson = new Map<string, string>();
  for (const bal of balances.data) {
    netByPerson.set(bal.personId, (netByPerson.get(bal.personId) ?? 0) + bal.amount);
    currencyByPerson.set(bal.personId, bal.currency);
  }

  // First group each person belongs to — shown as a subtitle in the People card.
  const groupNameByPerson = new Map<string, string>();
  for (const g of groups.data) {
    for (const memberId of g.memberIds) {
      if (!groupNameByPerson.has(memberId)) groupNameByPerson.set(memberId, g.name);
    }
  }

  // Net standing with everyone (per currency) — the People card header tally.
  const netByCurrency = new Map<string, number>();
  for (const bal of balances.data) {
    netByCurrency.set(bal.currency, (netByCurrency.get(bal.currency) ?? 0) + bal.amount);
  }
  const netEntries = [...netByCurrency.entries()].filter(([, amount]) => amount !== 0);

  return (
    <>
      <PageHeader eyebrow="Shared" title="Split & settle" subtitle="Who owes whom, gently sorted." />

      <div style={{ maxWidth: 1160, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {unreachable ? (
          <Notice tone="warn">
            The API is not reachable yet. People, groups and balances will appear once apps/api is running.
          </Notice>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', alignItems: 'start' }}>
          {/* Groups */}
          <Card title="Groups" padding="none">
            {groups.data.length === 0 ? (
              <div style={{ padding: 'var(--space-3) var(--space-5) var(--space-5)' }}>
                <EmptyState
                  icon={<FolderPlus />}
                  title="No groups yet"
                  message="Group the people you split with — roommates, a trip, a dinner."
                />
              </div>
            ) : (
              <div style={{ padding: '6px 16px 14px' }}>
                {groups.data.map((g, i) => {
                  const members = g.memberIds
                    .map((mid) => byPerson.get(mid))
                    .filter((p): p is Person => Boolean(p));
                  const net = g.memberIds.reduce((sum, mid) => sum + (netByPerson.get(mid) ?? 0), 0);
                  const currency = g.memberIds.map((mid) => currencyByPerson.get(mid)).find(Boolean) ?? 'USD';
                  return (
                    <div
                      key={g.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        padding: '13px 0',
                        borderTop: i ? '1px solid var(--border-subtle)' : 'none',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 'var(--weight-bold)',
                            color: 'var(--text-strong)',
                            fontFamily: 'var(--font-display)',
                            marginBottom: 7,
                          }}
                        >
                          {g.name}
                        </div>
                        {members.length > 0 ? (
                          <AvatarGroup size="sm" max={4} people={members.map((m) => ({ name: m.name, src: m.avatarUrl ?? undefined }))} />
                        ) : (
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-subtle)' }}>No members yet</span>
                        )}
                      </div>
                      {net !== 0 ? (
                        <Badge tone={net >= 0 ? 'positive' : 'negative'}>{formatSignedMoney(net, currency)}</Badge>
                      ) : (
                        <Badge tone="positive" dot>Settled</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* People */}
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
            {people.data.length === 0 ? (
              <div style={{ padding: 'var(--space-3) var(--space-5) var(--space-5)' }}>
                <EmptyState
                  icon={<Users />}
                  title="No people yet"
                  message="Add the people you split with to start tracking who owes whom."
                />
              </div>
            ) : (
              <div style={{ padding: '6px 16px 14px' }}>
                {people.data.map((p, i) => {
                  const net = netByPerson.get(p.id) ?? 0;
                  const currency = currencyByPerson.get(p.id) ?? 'USD';
                  const theyOweYou = net > 0;
                  const groupName = groupNameByPerson.get(p.id);
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        padding: '12px 0',
                        borderTop: i ? '1px solid var(--border-subtle)' : 'none',
                      }}
                    >
                      <Avatar name={p.name} src={p.avatarUrl ?? undefined} size="md" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 'var(--weight-semibold)', color: 'var(--text-strong)' }}>
                          {p.name}
                        </div>
                        <div
                          style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--text-subtle)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {groupName ?? p.email ?? ''}
                        </div>
                      </div>
                      {net === 0 ? (
                        <Badge tone="positive" dot>Settled</Badge>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          <div style={{ textAlign: 'right' }}>
                            <MoneyAmount amount={net} currency={currency} size="sm" />
                            <div style={{ fontSize: 11, color: 'var(--text-subtle)', fontWeight: 'var(--weight-semibold)' }}>
                              {theyOweYou ? 'owes you' : 'you owe'}
                            </div>
                          </div>
                          {theyOweYou ? <RemindButton personId={p.id} /> : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', alignItems: 'start' }}>
          <Card title="Settle up">
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: '0 0 var(--space-4)' }}>
              Record a payment between two people to clear what they owe — no fuss.
            </p>
            <SettleUpForm people={people.data.map((p) => ({ id: p.id, name: p.name }))} />
          </Card>

          <Card title="New group">
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: '0 0 var(--space-4)' }}>
              Bundle the people you split with so shared costs stay together.
            </p>
            <AddGroupForm people={people.data.map((p) => ({ id: p.id, name: p.name }))} />
          </Card>
        </div>
      </div>
    </>
  );
}
