/* Spendlio mobile — Home / overview screen */
(function () {
  const DS = window.SpendlioDesignSystem_5a5954;
  const { Card, ProgressBar, TransactionRow, MoneyAmount, Avatar, IconButton } = DS;
  const { ScreenHeader, SectionHeader, ScreenScroll, MIcon: I } = window;
  const D = window.SPENDLIO;

  function BalanceHero({ onClick }) {
    return (
      <Card variant="inverse" padded interactive onClick={onClick} style={{ borderRadius: 'var(--radius-2xl)', marginBottom: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em',
              color: 'var(--green-200)', textTransform: 'uppercase' }}>Total balance</div>
            <div data-money style={{ fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 40, letterSpacing: '-0.02em', color: '#fff', marginTop: 6, lineHeight: 1 }}>$2,480.50</div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 999, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'rgba(255,255,255,0.12)', color: '#fff' }}>
            <I n="chevron-right" s={19} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius-lg)', padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--green-200)', fontSize: 12, fontWeight: 600 }}>
              <I n="arrow-up-right" s={14} /> Spent
            </div>
            <div data-money style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginTop: 4, fontFamily: 'var(--font-display)' }}>$2,480</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius-lg)', padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--green-200)', fontSize: 12, fontWeight: 600 }}>
              <I n="arrow-down-left" s={14} /> Income
            </div>
            <div data-money style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginTop: 4, fontFamily: 'var(--font-display)' }}>$3,200</div>
          </div>
        </div>
      </Card>
    );
  }

  function SettleSnapshot({ onOpen }) {
    return (
      <Card interactive onClick={onOpen} style={{ marginBottom: 22 }} padded>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 22 }}>
            <div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600 }}>You're owed</div>
              <MoneyAmount value={86} tone="positive" display size={22} />
            </div>
            <div style={{ width: 1, background: 'var(--border-subtle)' }} />
            <div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600 }}>You owe</div>
              <MoneyAmount value={-24.5} tone="negative" display size={22} />
            </div>
          </div>
          <I n="chevron-right" s={20} />
        </div>
      </Card>
    );
  }

  function HomeScreen({ onSeeActivity, onSettle, onScan, onRecap, onAccounts, onSettings }) {
    const recent = D.activity[0].items.concat(D.activity[1].items).slice(0, 4);
    return (
      <>
        <ScreenHeader
          eyebrow="Good morning"
          title="Hey, Alex"
          right={(
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconButton variant="solid" size="md" label="Scan receipt" icon={<I n="scan-line" s={19} />} onClick={onScan} />
              <IconButton variant="solid" size="md" label="Notifications" icon={<I n="bell" s={19} />} />
              <button onClick={onSettings} aria-label="Settings" style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', borderRadius: 999 }}>
                <Avatar name="Alex Rivera" size="md" />
              </button>
            </div>
          )}
        />
        <ScreenScroll>
          <BalanceHero onClick={onAccounts} />
          <button onClick={onRecap} style={{ width: '100%', textAlign: 'left', cursor: 'pointer',
            border: '1px solid var(--green-200)', background: 'var(--surface-brand-sub)',
            borderRadius: 'var(--radius-lg)', padding: '13px 16px', marginBottom: 22, display: 'flex',
            alignItems: 'center', gap: 12, fontFamily: 'var(--font-sans)' }}>
            <span style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--green-600)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><I n="sparkles" s={18} /></span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--green-900)' }}>Your May recap is ready</span>
              <span style={{ display: 'block', fontSize: 12.5, color: 'var(--green-700)' }}>Spending down 12% · tap to view</span>
            </span>
            <I n="chevron-right" s={20} />
          </button>
          <SectionHeader action="Manage" onAction={onSettle}>Budgets</SectionHeader>
          <Card padded style={{ marginBottom: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {D.budgets.slice(0, 3).map((b) => (
              <ProgressBar key={b.category} label={b.label}
                valueLabel={`$${b.spent} / $${b.limit}`} value={b.spent} max={b.limit} />
            ))}
          </Card>
          <SectionHeader action="See all" onAction={onSettle}>Settle up</SectionHeader>
          <SettleSnapshot onOpen={onSettle} />
          <SectionHeader action="See all" onAction={onSeeActivity}>Recent activity</SectionHeader>
          <Card padded={false} style={{ padding: '6px 16px' }}>
            {recent.map((t) => (
              <TransactionRow key={t.id} title={t.title} category={t.category}
                merchant={t.merchant} subtitle={t.sub} amount={t.amount} signed={t.income} meta={t.meta} />
            ))}
          </Card>
        </ScreenScroll>
      </>
    );
  }

  window.HomeScreen = HomeScreen;
})();
