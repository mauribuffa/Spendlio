/* Spendlio mobile — first-run onboarding (welcome → currency → language) */
(function () {
  const DS = window.SpendlioDesignSystem_5a5954;
  const { Button } = DS;
  const { MIcon: I } = window;

  const CURRENCIES = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'ARS', name: 'Argentine Peso', symbol: '$' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  ];
  const LOCALES = [
    { code: 'en-US', name: 'English', region: 'United States' },
    { code: 'es-AR', name: 'Español', region: 'Argentina' },
    { code: 'pt-BR', name: 'Português', region: 'Brasil' },
    { code: 'fr-FR', name: 'Français', region: 'France' },
  ];

  function SelectRow({ selected, onClick, lead, title, sub }) {
    return (
      <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%',
        textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-sans)', padding: '14px 16px',
        borderRadius: 'var(--radius-lg)', background: 'var(--surface-card)',
        border: '1.5px solid ' + (selected ? 'var(--green-500)' : 'var(--border-subtle)'),
        boxShadow: selected ? 'var(--ring-brand)' : 'var(--shadow-xs)',
        transition: 'var(--transition-control)' }}>
        <span style={{ width: 40, height: 40, borderRadius: 999, flex: 'none', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: 16, background: selected ? 'var(--green-600)' : 'var(--surface-sunken)',
          color: selected ? '#fff' : 'var(--text-muted)' }}>{lead}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--text-strong)' }}>{title}</span>
          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-muted)' }}>{sub}</span>
        </span>
        <span style={{ flex: 'none', color: selected ? 'var(--green-600)' : 'var(--border-default)' }}>
          <I n={selected ? 'check-circle-2' : 'circle'} s={22} />
        </span>
      </button>
    );
  }

  function Dots({ step, total }) {
    return (
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} style={{ height: 6, borderRadius: 999, transition: 'all var(--dur-base) var(--ease-standard)',
            width: i === step ? 22 : 6, background: i === step ? 'var(--green-600)' : 'var(--neutral-300)' }} />
        ))}
      </div>
    );
  }

  function OnboardingScreen({ onDone, onHaveAccount }) {
    const [step, setStep] = React.useState(0);
    const [currency, setCurrency] = React.useState('USD');
    const [locale, setLocale] = React.useState('en-US');
    React.useEffect(() => { window.lucide && lucide.createIcons(); });

    const Header = ({ children, onBack }) => (
      <div style={{ paddingTop: 60, paddingBottom: 8, flex: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
        {onBack && (
          <button onClick={onBack} aria-label="Back" style={{ cursor: 'pointer', background: 'var(--surface-card)',
            border: '1px solid var(--border-subtle)', borderRadius: 999, width: 36, height: 36, display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <I n="chevron-left" s={20} />
          </button>
        )}
        <Dots step={step} total={3} />
      </div>
    );

    // Step 0 — welcome
    if (step === 0) {
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '0 24px 28px',
          background: 'radial-gradient(440px 300px at 50% 0%, var(--green-50), transparent 70%), var(--surface-canvas)' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, textAlign: 'center' }}>
            <img src="../../assets/logo-mark.svg" width="76" height="76" alt="Spendlio" />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 34, letterSpacing: '-0.02em', color: 'var(--green-900)' }}>Spendlio</div>
              <div style={{ fontSize: 16, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5, maxWidth: 280 }}>
                Spend with clarity. Split without the awkward.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 8 }}>
            <Button variant="primary" size="lg" fullWidth onClick={() => setStep(1)}>Get started</Button>
            <button onClick={onHaveAccount} style={{ background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 14.5, fontWeight: 600, color: 'var(--text-brand)', padding: 8 }}>
              I already have an account
            </button>
          </div>
        </div>
      );
    }

    // Steps 1 & 2 — currency / language
    const isCurrency = step === 1;
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '0 24px 28px', background: 'var(--surface-canvas)' }}>
        <Header onBack={() => setStep(step - 1)} />
        <div style={{ paddingTop: 18, flex: 'none' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em', color: 'var(--text-strong)', lineHeight: 1.1 }}>
            {isCurrency ? 'What currency do you think in?' : 'Choose your language'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
            {isCurrency
              ? 'Your totals and budgets show in this. You can still add expenses in any currency.'
              : 'You can read Spendlio in your language while keeping any base currency.'}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, padding: '18px 0' }}>
          {isCurrency
            ? CURRENCIES.map((c) => (
                <SelectRow key={c.code} selected={currency === c.code} onClick={() => setCurrency(c.code)}
                  lead={c.symbol} title={c.name} sub={c.code} />
              ))
            : LOCALES.map((l) => (
                <SelectRow key={l.code} selected={locale === l.code} onClick={() => setLocale(l.code)}
                  lead={l.code.slice(0, 2).toUpperCase()} title={l.name} sub={l.region} />
              ))}
        </div>
        <Button variant="primary" size="lg" fullWidth
          onClick={() => (isCurrency ? setStep(2) : onDone({ currency, locale }))}>
          {isCurrency ? 'Continue' : 'Start tracking'}
        </Button>
      </div>
    );
  }

  window.OnboardingScreen = OnboardingScreen;
})();
