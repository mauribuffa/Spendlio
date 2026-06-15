/* Spendlio web — dashboard shell + routing + pre-app flow + modals */
(function () {
  const DS = window.SpendlioDesignSystem_5a5954;
  const { Card, MoneyAmount, CategoryIcon, Button, Toast } = DS;
  const { WIcon, WebDonut, WebModal } = window;
  const D = window.SPENDLIO_WEB;

  const TITLES = {
    overview: ['Overview', 'May 2026 · Personal'],
    transactions: ['Transactions', '8 this month'],
    accounts: ['Accounts', '4 accounts · 2 currencies'],
    budgets: ['Budgets', 'May 2026'],
    split: ['Split & settle', 'Net +$61.50 across 3 groups'],
    assistant: ['Assistant', 'Ask about your money'],
    insights: ['Insights', 'AI summary for May'],
    settings: ['Settings', 'Account & preferences'],
  };

  function Insights() {
    const cards = [
      { icon: 'trending-down', tone: 'positive', title: 'Dining is down 12%', body: 'You spent $182 on dining in May vs $207 in April. Nice.' },
      { icon: 'triangle-alert', tone: 'negative', title: 'Shopping over budget', body: 'You\u2019re $60 over your $500 shopping budget this month.' },
      { icon: 'repeat', tone: 'info', title: '4 recurring charges', body: 'Subscriptions total $114/mo. Netflix renews May 27.' },
    ];
    const toneBg = { positive: 'var(--positive-50)', negative: 'var(--negative-50)', info: 'var(--info-50)' };
    const toneFg = { positive: 'var(--positive-700)', negative: 'var(--negative-700)', info: 'var(--info-700)' };
    return (
      <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start', maxWidth: 1160, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {cards.map((c) => (
            <Card key={c.title} padded style={{ borderRadius: 'var(--radius-xl)' }}>
              <div style={{ display: 'flex', gap: 13 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: toneBg[c.tone], color: toneFg[c.tone] }}>
                  <WIcon n={c.icon} s={20} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-strong)', fontFamily: 'var(--font-display)' }}>{c.title}</div>
                  <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.45 }}>{c.body}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Card title="Where May went" style={{ borderRadius: 'var(--radius-xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, paddingTop: 8 }}>
            <WebDonut data={D.categories} centerLabel="Total" centerValue="$2,480" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {D.categories.map((c) => (
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
    );
  }

  function RecapModal({ open, onClose }) {
    React.useEffect(() => { if (open) window.lucide && lucide.createIcons(); });
    const r = D.recap; const max = Math.max(...r.top.map((t) => t.value));
    return (
      <WebModal open={open} onClose={onClose} title="May recap" width={460}>
        <div style={{ padding: '4px 22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card variant="inverse" padded style={{ borderRadius: 'var(--radius-2xl)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', color: 'var(--green-200)', textTransform: 'uppercase' }}>You spent in May</div>
            <div data-money style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 40, color: '#fff', marginTop: 6, lineHeight: 1 }}>${r.spent.toLocaleString()}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.14)', color: '#fff', fontSize: 13, fontWeight: 600, padding: '5px 11px', borderRadius: 999, marginTop: 12 }}>
              <WIcon n="trending-down" s={15} /> {Math.abs(r.vsPrev)}% less than April
            </div>
          </Card>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Card padded><div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Net saved</div><MoneyAmount value={r.netSaved} tone="positive" display size={22} signed /></Card>
            <Card padded><div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Settled up</div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--text-strong)', marginTop: 2 }}>{r.settled} people</div></Card>
          </div>
          <Card padded style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {r.top.map((t) => (
              <div key={t.category} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CategoryIcon category={t.category} size="sm" />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-body)' }}>{t.label}</span>
                    <MoneyAmount value={-t.value} tone="neutral" weight={600} size={13.5} />
                  </div>
                  <div style={{ height: 7, borderRadius: 999, background: 'var(--surface-inset)' }}>
                    <div style={{ height: '100%', width: (t.value / max) * 100 + '%', borderRadius: 999, background: 'var(--green-500)' }} />
                  </div>
                </div>
              </div>
            ))}
          </Card>
          <Card variant="brand" padded style={{ borderColor: 'var(--green-200)' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--green-600)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><WIcon n="sparkles" s={18} /></div>
              <div style={{ fontSize: 13, color: 'var(--green-800)', lineHeight: 1.45 }}>{r.highlight}</div>
            </div>
          </Card>
        </div>
      </WebModal>
    );
  }

  function App() {
    const [phase, setPhase] = React.useState('onboarding'); // onboarding | login | app
    const [route, setRoute] = React.useState('overview');
    const [addOpen, setAddOpen] = React.useState(false);
    const [scanOpen, setScanOpen] = React.useState(false);
    const [recapOpen, setRecapOpen] = React.useState(false);
    const [toast, setToast] = React.useState(false);
    React.useEffect(() => { window.lucide && lucide.createIcons(); });
    React.useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(false), 2600); return () => clearTimeout(id); }, [toast]);

    function content() {
      switch (route) {
        case 'transactions': return <window.WebTransactions />;
        case 'accounts': return <window.WebAccounts />;
        case 'budgets': return <window.WebBudgets />;
        case 'split': return <window.WebSplit />;
        case 'assistant': return <window.WebAssistant />;
        case 'insights': return <Insights />;
        case 'settings': return <window.WebSettings />;
        default: return <window.WebOverview onRecap={() => setRecapOpen(true)} onSettle={() => setRoute('split')} onActivity={() => setRoute('transactions')} />;
      }
    }
    function onSaved() { setAddOpen(false); setScanOpen(false); setToast(true); setRoute('transactions'); }

    let inner;
    if (phase === 'onboarding') inner = <window.WebOnboarding onDone={() => setPhase('app')} onHaveAccount={() => setPhase('login')} />;
    else if (phase === 'login') inner = <window.WebLogin onLogin={() => setPhase('app')} onBack={() => setPhase('onboarding')} />;
    else {
      const [title, sub] = TITLES[route];
      const noChromeScroll = route === 'assistant';
      inner = (
        <div style={{ display: 'flex', height: '100%', background: 'var(--surface-canvas)', fontFamily: 'var(--font-sans)' }}>
          <window.WebSidebar active={route} onNav={setRoute} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', position: 'relative' }}>
            <window.WebTopbar title={title} subtitle={sub} onAdd={() => setAddOpen(true)} onScan={() => setScanOpen(true)} />
            <div style={{ flex: 1, overflowY: noChromeScroll ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>{content()}</div>

            <window.WebAddExpenseModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={onSaved} onScan={() => { setAddOpen(false); setScanOpen(true); }} />
            <window.WebReceiptScanModal open={scanOpen} onClose={() => setScanOpen(false)} onAdd={onSaved} />
            <RecapModal open={recapOpen} onClose={() => setRecapOpen(false)} />

            <div style={{ position: 'absolute', top: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 110, pointerEvents: 'none',
              transform: toast ? 'translateY(0)' : 'translateY(-160%)', opacity: toast ? 1 : 0, transition: 'all var(--dur-slow) var(--ease-entrance)' }}>
              <Toast title="Expense added" message="Split with Maya & Sam · $16.00 each" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <window.ChromeWindow width={1280} height={812} url="app.spendlio.com" tabs={[{ title: 'Spendlio' }]}>
        {inner}
      </window.ChromeWindow>
    );
  }

  window.SpendlioWebApp = App;
})();
