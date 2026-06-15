/* Spendlio web — Split & settle */
(function () {
  const DS = window.SpendlioDesignSystem_5a5954;
  const { Card, Avatar, AvatarGroup, Badge, Button, MoneyAmount } = DS;
  const { WIcon } = window;
  const D = window.SPENDLIO_WEB;

  const GROUPS = [
    { name: 'Roommates', members: ['Alex Rivera', 'Maya Okafor', 'Ari Cohen'], net: -42 },
    { name: 'Trip to Lisbon', members: ['Alex Rivera', 'Maya Okafor', 'Sam Reed', 'Lee Park'], net: 86 },
    { name: 'Dinner · Olio', members: ['Alex Rivera', 'Sam Reed'], net: -24.5 },
  ];

  function Split() {
    return (
      <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        <Card title="Groups" action={<a href="#" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-brand)' }}>New group</a>} padded={false}>
          <div style={{ padding: '6px 16px 14px' }}>
            {GROUPS.map((g, i) => (
              <div key={g.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0',
                borderTop: i ? '1px solid var(--border-subtle)' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-strong)', fontFamily: 'var(--font-display)', marginBottom: 7 }}>{g.name}</div>
                  <AvatarGroup size="sm" max={4} people={g.members.map((m) => ({ name: m }))} />
                </div>
                <Badge tone={g.net >= 0 ? 'positive' : 'negative'}>
                  {g.net >= 0 ? `+$${g.net.toFixed(2)}` : `\u2212$${Math.abs(g.net).toFixed(2)}`}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card title="People" action={<span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-brand)' }}>Net +$61.50</span>} padded={false}>
          <div style={{ padding: '6px 16px 14px' }}>
            {D.people.map((p, i) => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
                borderTop: i ? '1px solid var(--border-subtle)' : 'none' }}>
                <Avatar name={p.name} color={p.color} size="md" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-strong)' }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{p.group}</div>
                </div>
                {p.dir === 'settled' ? (
                  <Badge tone="positive" dot>Settled</Badge>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'right' }}>
                      <MoneyAmount value={p.dir === 'owes_you' ? p.amount : -p.amount} weight={700} size={14} />
                      <div style={{ fontSize: 11, color: 'var(--text-subtle)', fontWeight: 600 }}>{p.dir === 'owes_you' ? 'owes you' : 'you owe'}</div>
                    </div>
                    <Button variant="secondary" size="sm">{p.dir === 'owes_you' ? 'Remind' : 'Settle'}</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  window.WebSplit = Split;
})();
