/* Spendlio mobile — Split & Settle up screen */
(function () {
  const DS = window.SpendlioDesignSystem_5a5954;
  const { Card, Avatar, AvatarGroup, Badge, Button, MoneyAmount, IconButton } = DS;
  const { ScreenHeader, SectionHeader, ScreenScroll, MIcon: I } = window;
  const D = window.SPENDLIO;

  function PersonRow({ b, onSettle }) {
    const p = D.people[b.person];
    const owesYou = b.direction === 'owes_you';
    const settled = b.direction === 'settled';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 4px' }}>
        <Avatar name={p.name} color={p.color} size="md" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-strong)' }}>{p.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{b.group}</div>
        </div>
        {settled ? (
          <Badge tone="positive" dot>Settled</Badge>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <MoneyAmount value={owesYou ? b.amount : -b.amount} weight={700} size={15} />
            <span style={{ fontSize: 11, color: 'var(--text-subtle)', fontWeight: 600 }}>
              {owesYou ? 'owes you' : 'you owe'}
            </span>
          </div>
        )}
      </div>
    );
  }

  function SettleScreen({ onAdd }) {
    return (
      <>
        <ScreenHeader
          title="Split"
          right={<IconButton variant="brand" size="md" label="New group" icon={<I n="plus" s={20} />} onClick={onAdd} />}
        />
        <ScreenScroll>
          <Card variant="brand" padded style={{ marginBottom: 22, borderColor: 'var(--green-200)' }}>
            <div style={{ fontSize: 13, color: 'var(--green-800)', fontWeight: 600 }}>Overall, you're owed</div>
            <MoneyAmount value={61.5} tone="positive" display size={34} signed />
            <div style={{ fontSize: 12.5, color: 'var(--green-700)', marginTop: 4 }}>
              Across 3 groups · 4 people
            </div>
          </Card>

          <SectionHeader action="New group" onAction={onAdd}>Groups</SectionHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
            {D.groups.map((g) => (
              <Card key={g.name} interactive padded>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text-strong)',
                      fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>{g.name}</div>
                    <div style={{ marginTop: 8 }}>
                      <AvatarGroup size="sm" max={4}
                        people={g.members.map((m) => ({ name: D.people[m].name }))} />
                    </div>
                  </div>
                  <Badge tone={g.net >= 0 ? 'positive' : 'negative'}>
                    {g.net >= 0 ? `+$${g.net.toFixed(2)}` : `\u2212$${Math.abs(g.net).toFixed(2)}`}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>

          <SectionHeader>People</SectionHeader>
          <Card padded>
            {D.balances.map((b, i) => (
              <React.Fragment key={b.person}>
                {i > 0 && <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0 -20px' }} />}
                <PersonRow b={b} />
              </React.Fragment>
            ))}
          </Card>

          <div style={{ marginTop: 16 }}>
            <Button variant="primary" fullWidth size="lg" leadingIcon={<I n="check-check" s={18} />}>
              Settle up all
            </Button>
          </div>
        </ScreenScroll>
      </>
    );
  }

  window.SettleScreen = SettleScreen;
})();
