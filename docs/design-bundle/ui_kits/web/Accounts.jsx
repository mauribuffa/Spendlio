/* Spendlio web — Accounts (multi-currency "bank tabs") */
(function () {
  const DS = window.SpendlioDesignSystem_5a5954;
  const { Card, Badge, Button, SegmentedControl } = DS;
  const { WIcon } = window;
  const D = window.SPENDLIO_WEB;

  const TYPE_ICON = { card: 'credit-card', savings: 'piggy-bank', cash: 'wallet', checking: 'landmark' };
  const fmt = (v, cur) => new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(v);
  const toBase = (v, cur) => v * (D.fx.rates[cur] ?? 1);

  function AccountCard({ a }) {
    return (
      <Card padded style={{ borderRadius: 'var(--radius-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <span style={{ width: 44, height: 44, borderRadius: 12, flex: 'none', display: 'flex',
            alignItems: 'center', justifyContent: 'center', background: 'var(--surface-sunken)', color: 'var(--text-muted)' }}>
            <WIcon n={TYPE_ICON[a.type] || 'wallet'} s={22} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text-strong)', fontFamily: 'var(--font-display)' }}>{a.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {a.type}{a.mask ? ` ·· ${a.mask}` : ''} · {a.currency}
            </div>
          </div>
          <div data-money style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--text-strong)' }}>{fmt(a.balance, a.currency)}</div>
        </div>
      </Card>
    );
  }

  function Accounts() {
    const currencies = [...new Set(D.accounts.map((a) => a.currency))];
    const [tab, setTab] = React.useState('All');
    const allBase = D.accounts.reduce((s, a) => s + toBase(a.balance, a.currency), 0);
    const shown = tab === 'All' ? D.accounts : D.accounts.filter((a) => a.currency === tab);

    return (
      <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 920, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <SegmentedControl value={tab} onChange={setTab} options={['All', ...currencies]} />
          <Button variant="primary" leadingIcon={<WIcon n="plus" s={17} />}>Add account</Button>
        </div>

        {tab === 'All' ? (
          <Card variant="inverse" padded style={{ borderRadius: 'var(--radius-2xl)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', color: 'var(--green-200)', textTransform: 'uppercase' }}>Total balance · {D.fx.base}</div>
            <div data-money style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 40, color: '#fff', marginTop: 6, lineHeight: 1 }}>{fmt(allBase, D.fx.base)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, color: 'var(--green-200)', fontSize: 12 }}>
              <WIcon n="info" s={13} /> Approx · converted as of {D.fx.asOf}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
              {currencies.map((c) => {
                const sub = D.accounts.filter((a) => a.currency === c).reduce((s, a) => s + a.balance, 0);
                return (
                  <div key={c} style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius-lg)', padding: '12px 15px' }}>
                    <div style={{ color: 'var(--green-200)', fontSize: 12, fontWeight: 600 }}>{c} · exact</div>
                    <div data-money style={{ color: '#fff', fontWeight: 700, fontSize: 17, marginTop: 4, fontFamily: 'var(--font-display)' }}>{fmt(sub, c)}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
          <Card variant="brand" padded style={{ borderColor: 'var(--green-200)', borderRadius: 'var(--radius-2xl)' }}>
            <div style={{ fontSize: 12.5, color: 'var(--green-800)', fontWeight: 600 }}>{tab} balance · exact</div>
            <div data-money style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32, color: 'var(--green-900)', marginTop: 4 }}>
              {fmt(shown.reduce((s, a) => s + a.balance, 0), tab)}
            </div>
          </Card>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {shown.map((a) => <AccountCard key={a.id} a={a} />)}
        </div>
      </div>
    );
  }

  window.WebAccounts = Accounts;
})();
