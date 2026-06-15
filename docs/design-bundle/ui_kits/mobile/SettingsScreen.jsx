/* Spendlio mobile — Settings */
(function () {
  const DS = window.SpendlioDesignSystem_5a5954;
  const { Card, Avatar, Switch, Badge, IconButton } = DS;
  const { ScreenHeader, ScreenScroll, MIcon: I } = window;

  function Row({ icon, color, label, value, trailing, onClick, danger, last }) {
    const clickable = !!onClick;
    return (
      <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 0',
        cursor: clickable ? 'pointer' : 'default',
        borderTop: last ? 'none' : '1px solid var(--border-subtle)' }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, flex: 'none', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: `color-mix(in oklab, ${color} 14%, white)`, color }}>
          <I n={icon} s={18} />
        </span>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: danger ? 'var(--negative-600)' : 'var(--text-strong)' }}>{label}</span>
        {value != null && <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>{value}</span>}
        {trailing}
        {clickable && !trailing && <I n="chevron-right" s={18} />}
      </div>
    );
  }

  function Section({ title, children }) {
    return (
      <div style={{ marginBottom: 20 }}>
        <div className="ds-eyebrow" style={{ padding: '0 4px 8px' }}>{title}</div>
        <Card padded>{children}</Card>
      </div>
    );
  }

  function SettingsScreen({ onBack, onAccounts }) {
    const [faceId, setFaceId] = React.useState(true);
    const [reminders, setReminders] = React.useState(true);
    const [recapNotif, setRecapNotif] = React.useState(true);
    React.useEffect(() => { window.lucide && lucide.createIcons(); });

    return (
      <>
        <ScreenHeader title="Settings" onBack={onBack} />
        <ScreenScroll>
          <Card padded style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name="Alex Rivera" size="lg" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text-strong)' }}>Alex Rivera</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>alex@hey.com</div>
              </div>
              <IconButton variant="solid" size="sm" label="Edit profile" icon={<I n="pencil" s={16} />} />
            </div>
          </Card>

          <Section title="Preferences">
            <Row icon="circle-dollar-sign" color="#1B6E4F" label="Base currency" value="USD · $" onClick={() => {}} />
            <Row icon="languages" color="#3A6BAB" label="Language" value="English (US)" onClick={() => {}} />
            <Row icon="clock" color="#BE8A30" label="Time zone" value="New York" onClick={() => {}} last />
          </Section>

          <Section title="Money">
            <Row icon="wallet" color="#1B6E4F" label="Accounts" value="4" onClick={onAccounts} />
            <Row icon="chart-pie" color="#7C5CBF" label="Budgets" onClick={() => {}} />
            <Row icon="repeat" color="#D2864B" label="Recurring" value="3" onClick={() => {}} />
            <Row icon="users" color="#2E9D9A" label="Groups & people" onClick={() => {}} last />
          </Section>

          <Section title="Notifications">
            <Row icon="bell" color="#3A6BAB" label="Settle-up reminders"
              trailing={<Switch checked={reminders} onChange={(e) => setReminders(e.target.checked)} />} />
            <Row icon="sparkles" color="#BE8A30" label="Monthly recap"
              trailing={<Switch checked={recapNotif} onChange={(e) => setRecapNotif(e.target.checked)} />} last />
          </Section>

          <Section title="Security">
            <Row icon="scan-face" color="#1B6E4F" label="Face ID"
              trailing={<Switch checked={faceId} onChange={(e) => setFaceId(e.target.checked)} />} />
            <Row icon="lock" color="#6A6557" label="Change password" onClick={() => {}} last />
          </Section>

          <Section title="About">
            <Row icon="circle-help" color="#3A6BAB" label="Help & support" onClick={() => {}} />
            <Row icon="shield-check" color="#2E9D9A" label="Privacy" onClick={() => {}} />
            <Row icon="log-out" color="#C24A3E" label="Sign out" danger onClick={() => {}} last />
          </Section>

          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-subtle)', padding: '4px 0 8px' }}>
            Spendlio · v1.0.0
          </div>
        </ScreenScroll>
      </>
    );
  }

  window.SettingsScreen = SettingsScreen;
})();
