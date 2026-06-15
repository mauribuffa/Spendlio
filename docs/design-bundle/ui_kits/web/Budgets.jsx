/* Spendlio web — Budgets */
(function () {
  const DS = window.SpendlioDesignSystem_5a5954;
  const { Card, CategoryIcon, ProgressBar, MoneyAmount, Badge, Button } = DS;
  const { WIcon } = window;
  const D = window.SPENDLIO_WEB;

  function Budgets() {
    const totalSpent = D.budgets.reduce((s, b) => s + b.spent, 0);
    const totalLimit = D.budgets.reduce((s, b) => s + b.limit, 0);
    return (
      <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card variant="inverse" padded style={{ borderRadius: 'var(--radius-2xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', color: 'var(--green-200)', textTransform: 'uppercase' }}>May budget</div>
              <div data-money style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 34, color: '#fff', marginTop: 6 }}>
                ${totalSpent.toLocaleString()} <span style={{ color: 'var(--green-200)', fontSize: 20, fontWeight: 500 }}>/ ${totalLimit.toLocaleString()}</span>
              </div>
            </div>
            <Button variant="accent" leadingIcon={<WIcon n="plus" s={17} />}>New budget</Button>
          </div>
          <div style={{ marginTop: 16, height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.16)' }}>
            <div style={{ height: '100%', width: (totalSpent / totalLimit) * 100 + '%', borderRadius: 999, background: 'var(--green-300)' }} />
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
          {D.budgets.map((b) => {
            const over = b.spent > b.limit;
            const remaining = b.limit - b.spent;
            return (
              <Card key={b.category} padded>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <CategoryIcon category={b.category} size="md" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-strong)', fontFamily: 'var(--font-display)' }}>{b.label}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                      {over ? 'Over by ' : ''}
                      <span data-money>${Math.abs(remaining)}</span>{over ? '' : ' left'}
                    </div>
                  </div>
                  {over && <Badge tone="negative" size="sm">Over</Badge>}
                </div>
                <ProgressBar value={b.spent} max={b.limit} valueLabel={`$${b.spent} / $${b.limit}`} />
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  window.WebBudgets = Budgets;
})();
