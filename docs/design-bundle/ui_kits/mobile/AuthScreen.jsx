/* Spendlio mobile — Login / auth gate */
(function () {
  const DS = window.SpendlioDesignSystem_5a5954;
  const { Input, Button } = DS;
  const { MIcon: I } = window;

  function AuthScreen({ onLogin }) {
    const [email, setEmail] = React.useState('alex@hey.com');
    const [pw, setPw] = React.useState('••••••••');
    React.useEffect(() => { window.lucide && lucide.createIcons(); });

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
        background: 'radial-gradient(420px 280px at 50% 0%, var(--green-50), transparent 70%), var(--surface-canvas)',
        padding: '0 24px' }}>
        <div style={{ paddingTop: 92, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <img src="../../assets/logo-mark.svg" width="60" height="60" alt="Spendlio" />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28,
              letterSpacing: '-0.02em', color: 'var(--green-900)' }}>Welcome back</div>
            <div style={{ fontSize: 14.5, color: 'var(--text-muted)', marginTop: 6 }}>
              Track, split, and settle — calmly.
            </div>
          </div>
        </div>

        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            leadingIcon={<I n="mail" s={18} />} type="email" />
          <Input label="Password" value={pw} onChange={(e) => setPw(e.target.value)}
            leadingIcon={<I n="lock" s={18} />} trailingIcon={<I n="eye" s={18} />} type="password" />
          <div style={{ textAlign: 'right', marginTop: -4 }}>
            <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-brand)' }}>Forgot password?</a>
          </div>
          <Button variant="primary" size="lg" fullWidth onClick={onLogin}>Log in</Button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 18px' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-subtle)', fontWeight: 600 }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button variant="secondary" size="lg" fullWidth onClick={onLogin}
            leadingIcon={<I n="apple" s={18} />}>Continue with Apple</Button>
          <Button variant="secondary" size="lg" fullWidth onClick={onLogin}
            leadingIcon={<I n="chrome" s={18} />}>Continue with Google</Button>
        </div>

        <div style={{ marginTop: 'auto', paddingBottom: 40, textAlign: 'center', fontSize: 13.5, color: 'var(--text-muted)' }}>
          New to Spendlio? <a href="#" onClick={(e) => { e.preventDefault(); onLogin(); }} style={{ fontWeight: 700, color: 'var(--text-brand)' }}>Create account</a>
        </div>
      </div>
    );
  }

  window.AuthScreen = AuthScreen;
})();
