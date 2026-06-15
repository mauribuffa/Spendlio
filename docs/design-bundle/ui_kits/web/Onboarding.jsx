/* Spendlio web — pre-app flow: onboarding (welcome → currency → language) + login */
(function () {
  const DS = window.SpendlioDesignSystem_5a5954;
  const { Button, Input } = DS;
  const { WIcon } = window;

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

  // Centered card on a warm canvas — the whole browser viewport.
  function Shell({ children, maxWidth = 460 }) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32,
        background: 'radial-gradient(700px 460px at 50% -5%, var(--green-50), transparent 70%), var(--surface-canvas)', fontFamily: 'var(--font-sans)' }}>
        <div style={{ width: '100%', maxWidth }}>{children}</div>
      </div>
    );
  }

  function SelectRow({ selected, onClick, lead, title, sub }) {
    return (
      <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left',
        cursor: 'pointer', fontFamily: 'var(--font-sans)', padding: '14px 16px', borderRadius: 'var(--radius-lg)',
        background: 'var(--surface-card)', border: '1.5px solid ' + (selected ? 'var(--green-500)' : 'var(--border-subtle)'),
        boxShadow: selected ? 'var(--ring-brand)' : 'var(--shadow-xs)', transition: 'var(--transition-control)' }}>
        <span style={{ width: 40, height: 40, borderRadius: 999, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, background: selected ? 'var(--green-600)' : 'var(--surface-sunken)', color: selected ? '#fff' : 'var(--text-muted)' }}>{lead}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--text-strong)' }}>{title}</span>
          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-muted)' }}>{sub}</span>
        </span>
        <span style={{ flex: 'none', color: selected ? 'var(--green-600)' : 'var(--border-default)' }}><WIcon n={selected ? 'check-circle-2' : 'circle'} s={22} /></span>
      </button>
    );
  }

  function Dots({ step, total }) {
    return (
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} style={{ height: 6, borderRadius: 999, transition: 'all var(--dur-base) var(--ease-standard)', width: i === step ? 24 : 6, background: i === step ? 'var(--green-600)' : 'var(--neutral-300)' }} />
        ))}
      </div>
    );
  }

  function Onboarding({ onDone, onHaveAccount }) {
    const [step, setStep] = React.useState(0);
    const [currency, setCurrency] = React.useState('USD');
    const [locale, setLocale] = React.useState('en-US');
    React.useEffect(() => { window.lucide && lucide.createIcons(); });

    if (step === 0) {
      return (
        <Shell>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <img src="../../assets/logo-mark.svg" width="76" height="76" alt="Spendlio" />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 38, letterSpacing: '-0.02em', color: 'var(--green-900)' }}>Spendlio</div>
              <div style={{ fontSize: 17, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>Spend with clarity. Split without the awkward.</div>
            </div>
            <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              <Button variant="primary" size="lg" fullWidth onClick={() => setStep(1)}>Get started</Button>
              <button onClick={onHaveAccount} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 14.5, fontWeight: 600, color: 'var(--text-brand)', padding: 8 }}>I already have an account</button>
            </div>
          </div>
        </Shell>
      );
    }

    const isCurrency = step === 1;
    return (
      <Shell maxWidth={480}>
        <Dots step={step} total={3} />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em', color: 'var(--text-strong)', lineHeight: 1.1, textAlign: 'center' }}>
          {isCurrency ? 'What currency do you think in?' : 'Choose your language'}
        </div>
        <div style={{ fontSize: 14.5, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5, textAlign: 'center', maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
          {isCurrency ? 'Your totals and budgets show in this. You can still add expenses in any currency.'
            : 'Read Spendlio in your language while keeping any base currency.'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '22px 0' }}>
          {isCurrency
            ? CURRENCIES.map((c) => <SelectRow key={c.code} selected={currency === c.code} onClick={() => setCurrency(c.code)} lead={c.symbol} title={c.name} sub={c.code} />)
            : LOCALES.map((l) => <SelectRow key={l.code} selected={locale === l.code} onClick={() => setLocale(l.code)} lead={l.code.slice(0, 2).toUpperCase()} title={l.name} sub={l.region} />)}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)} leadingIcon={<WIcon n="chevron-left" s={18} />}>Back</Button>
          <Button variant="primary" size="lg" fullWidth onClick={() => (isCurrency ? setStep(2) : onDone())}>{isCurrency ? 'Continue' : 'Start tracking'}</Button>
        </div>
      </Shell>
    );
  }

  function Login({ onLogin, onBack }) {
    React.useEffect(() => { window.lucide && lucide.createIcons(); });
    return (
      <Shell>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <img src="../../assets/logo-mark.svg" width="56" height="56" alt="Spendlio" />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em', color: 'var(--green-900)' }}>Welcome back</div>
            <div style={{ fontSize: 14.5, color: 'var(--text-muted)', marginTop: 6 }}>Track, split, and settle — calmly.</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Email" defaultValue="alex@hey.com" leadingIcon={<WIcon n="mail" s={18} />} type="email" />
          <Input label="Password" defaultValue="password" leadingIcon={<WIcon n="lock" s={18} />} trailingIcon={<WIcon n="eye" s={18} />} type="password" />
          <Button variant="primary" size="lg" fullWidth onClick={onLogin}>Log in</Button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0 16px' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-subtle)', fontWeight: 600 }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="lg" fullWidth onClick={onLogin} leadingIcon={<WIcon n="apple" s={18} />}>Apple</Button>
          <Button variant="secondary" size="lg" fullWidth onClick={onLogin} leadingIcon={<WIcon n="chrome" s={18} />}>Google</Button>
        </div>
        <div style={{ textAlign: 'center', fontSize: 13.5, color: 'var(--text-muted)', marginTop: 22 }}>
          New here? <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'var(--text-brand)', fontFamily: 'var(--font-sans)', fontSize: 13.5 }}>Create account</button>
        </div>
      </Shell>
    );
  }

  Object.assign(window, { WebOnboarding: Onboarding, WebLogin: Login });
})();
