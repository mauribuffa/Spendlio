/* Spendlio mobile — app shell: tab bar, FAB, routing, toast */
(function () {
  const DS = window.SpendlioDesignSystem_5a5954;
  const { Toast } = DS;
  const { MIcon: I } = window;

  const TABS = [
    { key: 'home', label: 'Home', icon: 'house' },
    { key: 'activity', label: 'Activity', icon: 'list' },
    { key: 'split', label: 'Split', icon: 'users' },
    { key: 'chat', label: 'Assistant', icon: 'sparkles' },
  ];

  function TabBar({ active, onChange, onAdd }) {
    const item = (t) => {
      const on = active === t.key;
      return (
        <button key={t.key} onClick={() => onChange(t.key)} style={{ flex: 1, display: 'flex',
          flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none',
          cursor: 'pointer', padding: '2px 0', color: on ? 'var(--green-700)' : 'var(--neutral-500)' }}>
          <i data-lucide={t.icon} style={{ width: 23, height: 23 }}></i>
          <span style={{ fontSize: 10.5, fontWeight: on ? 700 : 600, fontFamily: 'var(--font-sans)' }}>{t.label}</span>
        </button>
      );
    };
    return (
      <div style={{ flex: 'none', position: 'relative', display: 'flex', alignItems: 'flex-start',
        padding: '10px 10px 26px', background: 'rgba(255,255,255,0.86)',
        backdropFilter: 'blur(18px) saturate(180%)', WebkitBackdropFilter: 'blur(18px) saturate(180%)',
        borderTop: '1px solid var(--border-subtle)' }}>
        {item(TABS[0])}
        {item(TABS[1])}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <button onClick={onAdd} aria-label="Add expense" style={{ width: 56, height: 56, borderRadius: 999,
            marginTop: -28, background: 'var(--action-primary)', color: '#fff', border: '4px solid var(--surface-canvas)',
            boxShadow: 'var(--shadow-brand)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i data-lucide="plus" style={{ width: 26, height: 26 }}></i>
          </button>
        </div>
        {item(TABS[2])}
        {item(TABS[3])}
      </div>
    );
  }

  function App() {
    const [phase, setPhase] = React.useState('onboarding');
    const [tab, setTab] = React.useState('home');
    const [sheet, setSheet] = React.useState(false);
    const [scan, setScan] = React.useState(false);
    const [recap, setRecap] = React.useState(false);
    const [pushed, setPushed] = React.useState(null);
    const [toast, setToast] = React.useState(false);

    React.useEffect(() => { window.lucide && lucide.createIcons(); });
    React.useEffect(() => {
      if (!toast) return;
      const id = setTimeout(() => setToast(false), 2600);
      return () => clearTimeout(id);
    }, [toast]);

    function renderScreen() {
      switch (tab) {
        case 'activity': return <window.ActivityScreen onScan={() => setScan(true)} />;
        case 'split': return <window.SettleScreen onAdd={() => setSheet(true)} />;
        case 'chat': return <window.ChatScreen />;
        default: return <window.HomeScreen onSeeActivity={() => setTab('activity')}
          onSettle={() => setTab('split')} onScan={() => setScan(true)} onRecap={() => setRecap(true)}
          onAccounts={() => setPushed('accounts')} onSettings={() => setPushed('settings')} />;
      }
    }

    function onSaved() { setSheet(false); setScan(false); setToast(true); setTab('activity'); }

    if (phase === 'onboarding') {
      return (
        <window.IOSDevice>
          <window.OnboardingScreen onDone={() => setPhase('app')} onHaveAccount={() => setPhase('login')} />
        </window.IOSDevice>
      );
    }
    if (phase === 'login') {
      return (
        <window.IOSDevice>
          <window.AuthScreen onLogin={() => setPhase('app')} />
        </window.IOSDevice>
      );
    }

    return (
      <window.IOSDevice>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative',
          background: 'var(--surface-canvas)', overflow: 'hidden' }}>
          {pushed ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {pushed === 'settings'
                ? <window.SettingsScreen onBack={() => setPushed(null)} onAccounts={() => setPushed('accounts')} />
                : <window.AccountsScreen onBack={() => setPushed(null)} />}
            </div>
          ) : (
            <>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {renderScreen()}
              </div>
              <TabBar active={tab} onChange={setTab} onAdd={() => setSheet(true)} />
            </>
          )}

          <window.AddExpenseSheet open={sheet} onClose={() => setSheet(false)} onSaved={onSaved}
            onScan={() => { setSheet(false); setScan(true); }} />
          <window.ReceiptScanSheet open={scan} onClose={() => setScan(false)} onAdd={onSaved}
            onSplit={() => { setScan(false); setSheet(true); }} />
          <window.MonthlyRecapSheet open={recap} onClose={() => setRecap(false)} />

          <div style={{ position: 'absolute', top: 58, left: 16, right: 16, zIndex: 90,
            display: 'flex', justifyContent: 'center',
            transform: toast ? 'translateY(0)' : 'translateY(-140%)', opacity: toast ? 1 : 0,
            transition: 'all var(--dur-slow) var(--ease-entrance)', pointerEvents: 'none' }}>
            <Toast title="Expense added" message="Split with Maya & Sam · $16.00 each" />
          </div>
        </div>
      </window.IOSDevice>
    );
  }

  window.SpendlioApp = App;
})();
