/* Spendlio mobile — Accounts (multi-currency "bank tabs") */
(function () {
  const DS = window.SpendlioDesignSystem_5a5954;
  const { Card, IconButton, Badge, SegmentedControl } = DS;
  const { ScreenHeader, ScreenScroll, MIcon: I } = window;
  const D = window.SPENDLIO;

  const TYPE_ICON = { card: 'credit-card', savings: 'piggy-bank', cash: 'wallet', checking: 'landmark' };

  const fmt = (v, cur) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(v);
  const toBase = (v, cur) => v * (D.fx.rates[cur] ?? 1);

  function AccountRow({ a, last }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 0',
        borderTop: last ? 'none' : '1px solid var(--border-subtle)' }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, flex: 'none', display: 'flex',
          alignItems: 'center', justifyContent: 'center', background: 'var(--surface-sunken)', color: 'var(--text-muted)' }}>
          <I n={TYPE_ICON[a.type] || 'wallet'} s={20} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-strong)' }}>{a.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
            {a.type}{a.mask ? ` ·· ${a.mask}` : ''}
          </div>
        </div>
        <span data-money style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-strong)',
          fontVariantNumeric: 'tabular-nums' }}>{fmt(a.balance, a.currency)}</span>
      </div>
    );
  }

  function CurrencyGroup({ currency }) {
    const accts = D.accounts.filter((a) => a.currency === currency);
    const subtotal = accts.reduce((s, a) => s + a.balance, 0);
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 4px 8px' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.02em' }}>
            {currency} <span style={{ color: 'var(--text-subtle)', fontWeight: 500 }}>· {accts.length} account{accts.length > 1 ? 's' : ''}</span>
          </span>
          <span data-money style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-body)' }}>{fmt(subtotal, currency)}</span>
        </div>
        <Card padded>
          {accts.map((a, i) => <AccountRow key={a.id} a={a} last={i === accts.length - 1} />)}
        </Card>
      </div>
    );
  }

  function AccountsScreen({ onBack }) {
    const currencies = [...new Set(D.accounts.map((a) => a.currency))];
    const [tab, setTab] = React.useState('All');
    React.useEffect(() => { window.lucide && lucide.createIcons(); });

    const allBase = D.accounts.reduce((s, a) => s + toBase(a.balance, a.currency), 0);

    return (
      <>
        <ScreenHeader
          title="Accounts"
          onBack={onBack}
          right={<IconButton variant="brand" size="md" label="Add account" icon={<I n="plus" s={20} />} />}
        />
        <div style={{ padding: '0 20px 12px', flex: 'none' }}>
          <SegmentedControl fullWidth value={tab} onChange={setTab}
            options={['All', ...currencies]} />
        </div>
        <ScreenScroll pad={20}>
          {tab === 'All' ? (
            <>
              <Card variant="inverse" padded style={{ borderRadius: 'var(--radius-2xl)', marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', color: 'var(--green-200)', textTransform: 'uppercase' }}>
                  Total balance · {D.fx.base}
                </div>
                <div data-money style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 38,
                  color: '#fff', marginTop: 6, lineHeight: 1 }}>{fmt(allBase, D.fx.base)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, color: 'var(--green-200)', fontSize: 12 }}>
                  <I n="info" s={13} /> Approx · converted as of {D.fx.asOf}
                </div>
              </Card>
              {currencies.map((c) => <CurrencyGroup key={c} currency={c} />)}
            </>
          ) : (
            <>
              <Card variant="brand" padded style={{ borderColor: 'var(--green-200)', marginBottom: 18 }}>
                <div style={{ fontSize: 12.5, color: 'var(--green-800)', fontWeight: 600 }}>{tab} balance · exact</div>
                <div data-money style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30,
                  color: 'var(--green-900)', marginTop: 4 }}>
                  {fmt(D.accounts.filter((a) => a.currency === tab).reduce((s, a) => s + a.balance, 0), tab)}
                </div>
              </Card>
              <Card padded>
                {D.accounts.filter((a) => a.currency === tab).map((a, i, arr) =>
                  <AccountRow key={a.id} a={a} last={i === arr.length - 1} />)}
              </Card>
            </>
          )}
        </ScreenScroll>
      </>
    );
  }

  window.AccountsScreen = AccountsScreen;
})();
