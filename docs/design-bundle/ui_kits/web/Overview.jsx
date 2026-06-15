/* Spendlio web — Overview dashboard (iOS-flavored: green hero, recap banner, rounded cards) */
(function () {
  const DS = window.SpendlioDesignSystem_5a5954;
  const { Card, Stat, TransactionRow, MoneyAmount, Badge, Avatar, Button, SegmentedControl } = DS;
  const { WebDonut, WebBarChart, WIcon } = window;
  const D = window.SPENDLIO_WEB;

  function BalanceHero() {
    return (
      <Card variant="inverse" padded style={{ borderRadius: 'var(--radius-2xl)', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', color: 'var(--green-200)', textTransform: 'uppercase' }}>Total balance · {D.fx.base}</div>
            <div data-money style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 44, letterSpacing: '-0.02em', color: '#fff', marginTop: 8, lineHeight: 1 }}>$8,186</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: 'var(--green-200)', fontSize: 12 }}>
              <WIcon n="info" s={13} /> Approx · across 4 accounts as of {D.fx.asOf}
            </div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 999, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'rgba(255,255,255,0.12)', color: '#fff' }}>
            <WIcon n="wallet" s={20} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
          {[['arrow-up-right', 'Spent', '$2,480'], ['arrow-down-left', 'Income', '$3,200'], ['piggy-bank', 'Saved', '$720']].map(([ic, lb, vl]) => (
            <div key={lb} style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius-lg)', padding: '13px 15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--green-200)', fontSize: 12, fontWeight: 600 }}>
                <WIcon n={ic} s={14} /> {lb}
              </div>
              <div data-money style={{ color: '#fff', fontWeight: 700, fontSize: 19, marginTop: 4, fontFamily: 'var(--font-display)' }}>{vl}</div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  function RecapBanner({ onOpen }) {
    return (
      <Card variant="brand" interactive onClick={onOpen} padded
        style={{ borderColor: 'var(--green-200)', borderRadius: 'var(--radius-2xl)', height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--green-600)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><WIcon n="sparkles" s={19} /></span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--green-900)' }}>Your May recap</span>
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--green-800)', marginTop: 12, lineHeight: 1.5, flex: 1 }}>
            Spending is <strong>down 12%</strong> from April — your calmest month since February.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--green-700)', fontSize: 13, fontWeight: 600, marginTop: 8 }}>
            View recap <WIcon n="arrow-right" s={15} />
          </div>
        </div>
      </Card>
    );
  }

  function Overview({ onRecap, onSettle, onActivity }) {
    const [range, setRange] = React.useState('6M');
    return (
      <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1160, margin: '0 auto' }}>
        {/* hero + recap */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 18 }}>
          <BalanceHero />
          <RecapBanner onOpen={onRecap} />
        </div>

        {/* chart + donut */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 18 }}>
          <Card title="Spending" action={(
            <SegmentedControl options={['3M', '6M', '1Y']} value={range} onChange={setRange} />
          )} style={{ borderRadius: 'var(--radius-xl)' }}>
            <div style={{ paddingTop: 20 }}>
              <WebBarChart months={D.months} />
            </div>
          </Card>

          <Card title="Categories" style={{ borderRadius: 'var(--radius-xl)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 6 }}>
              <WebDonut data={D.categories} centerLabel="Total" centerValue="$2,480" />
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {D.categories.slice(0, 4).map((c) => (
                  <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: c.color, flex: 'none' }} />
                    <span style={{ flex: 1, color: 'var(--text-body)', fontWeight: 500 }}>{c.label}</span>
                    <MoneyAmount value={-c.value} tone="neutral" weight={600} size={13} />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* transactions + settle */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 18 }}>
          <Card title="Recent transactions"
            action={<button onClick={onActivity} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-brand)', fontFamily: 'var(--font-sans)' }}>View all</button>}
            padded={false} style={{ borderRadius: 'var(--radius-xl)' }}>
            <div style={{ padding: '6px 16px' }}>
              {D.txns.slice(0, 5).map((t) => (
                <TransactionRow key={t.id} title={t.title} category={t.category}
                  merchant={t.account} subtitle={t.split ? `Split with ${t.split}` : null}
                  amount={t.amount} signed={t.income} meta={t.date} onClick={() => {}} />
              ))}
            </div>
          </Card>

          <Card title="Settle up" padded={false} style={{ borderRadius: 'var(--radius-xl)' }}>
            <div style={{ padding: '6px 16px 14px' }}>
              {D.people.map((p, i) => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0',
                  borderTop: i ? '1px solid var(--border-subtle)' : 'none' }}>
                  <Avatar name={p.name} color={p.color} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>{p.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-subtle)' }}>{p.group}</div>
                  </div>
                  {p.dir === 'settled'
                    ? <Badge tone="positive" size="sm" dot>Settled</Badge>
                    : <MoneyAmount value={p.dir === 'owes_you' ? p.amount : -p.amount} weight={700} size={13.5} />}
                </div>
              ))}
              <Button variant="secondary" fullWidth size="sm" style={{ marginTop: 12 }} onClick={onSettle}
                leadingIcon={<WIcon n="check-check" s={16} />}>Settle up all</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  window.WebOverview = Overview;
})();
