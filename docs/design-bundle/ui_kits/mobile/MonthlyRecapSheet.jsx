/* Spendlio mobile — Monthly recap sheet */
(function () {
  const DS = window.SpendlioDesignSystem_5a5954;
  const { Card, MoneyAmount, Badge, CategoryIcon, Button } = DS;
  const { Sheet, MIcon: I } = window;

  const TOP = [
    { cat: 'housing', label: 'Housing', value: 980 },
    { cat: 'shopping', label: 'Shopping', value: 560 },
    { cat: 'dining', label: 'Dining', value: 420 },
    { cat: 'groceries', label: 'Groceries', value: 310 },
  ];

  function MonthlyRecapSheet({ open, onClose }) {
    React.useEffect(() => { if (open) window.lucide && lucide.createIcons(); });
    const max = Math.max(...TOP.map((t) => t.value));

    return (
      <Sheet open={open} onClose={onClose} title="May recap">
        <div style={{ padding: '4px 20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card variant="inverse" padded style={{ borderRadius: 'var(--radius-2xl)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', color: 'var(--green-200)', textTransform: 'uppercase' }}>You spent in May</div>
            <div data-money style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 42,
              color: '#fff', marginTop: 6, lineHeight: 1 }}>$2,480</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.14)',
                color: '#fff', fontSize: 13, fontWeight: 600, padding: '5px 11px', borderRadius: 999 }}>
                <I n="trending-down" s={15} /> 12% less than April
              </span>
            </div>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Card padded>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Net saved</div>
              <MoneyAmount value={720} tone="positive" display size={24} signed />
            </Card>
            <Card padded>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Settled up</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: 'var(--text-strong)', marginTop: 2 }}>2 people</div>
            </Card>
          </div>

          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-strong)', padding: '6px 4px 10px' }}>Where it went</div>
            <Card padded style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {TOP.map((t) => (
                <div key={t.cat} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <CategoryIcon category={t.cat} size="sm" />
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
          </div>

          <Card variant="brand" padded style={{ borderColor: 'var(--green-200)' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--green-600)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><I n="sparkles" s={18} /></div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--green-900)' }}>Dining is trending down</div>
                <div style={{ fontSize: 13, color: 'var(--green-800)', marginTop: 3, lineHeight: 1.45 }}>
                  You spent $182 eating out — your calmest month since February. Keep it up.
                </div>
              </div>
            </div>
          </Card>

          <Button variant="secondary" size="lg" fullWidth leadingIcon={<I n="share" s={18} />}>Share recap</Button>
        </div>
      </Sheet>
    );
  }

  window.MonthlyRecapSheet = MonthlyRecapSheet;
})();
