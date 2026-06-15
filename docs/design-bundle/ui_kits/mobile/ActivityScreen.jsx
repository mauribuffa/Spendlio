/* Spendlio mobile — Activity (transaction list) screen */
(function () {
  const DS = window.SpendlioDesignSystem_5a5954;
  const { Input, Tag, TransactionRow, Card } = DS;
  const { ScreenHeader, ScreenScroll, MIcon: I } = window;
  const D = window.SPENDLIO;

  const FILTERS = [
    { key: 'all', label: 'All', color: null },
    { key: 'groceries', label: 'Groceries', color: '#1B6E4F' },
    { key: 'dining', label: 'Dining', color: '#BE8A30' },
    { key: 'transport', label: 'Transport', color: '#3A6BAB' },
    { key: 'travel', label: 'Travel', color: '#3A6BAB' },
  ];

  function ActivityScreen({ onScan }) {
    const [filter, setFilter] = React.useState('all');
    const groups = D.activity
      .map((g) => ({ ...g, items: g.items.filter((t) => filter === 'all' || t.category === filter) }))
      .filter((g) => g.items.length);

    return (
      <>
        <ScreenHeader
          title="Activity"
          right={(
            <div style={{ display: 'flex', gap: 8 }}>
              <DS.IconButton variant="solid" size="md" label="Scan receipt" icon={<I n="scan-line" s={18} />} onClick={onScan} />
              <DS.IconButton variant="solid" size="md" label="Filter" icon={<I n="sliders-horizontal" s={18} />} />
            </div>
          )}
        />
        <div style={{ padding: '0 20px 8px', flex: 'none' }}>
          <Input placeholder="Search transactions" leadingIcon={<I n="search" s={18} />} />
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '8px 20px 14px', flex: 'none' }}>
          {FILTERS.map((f) => (
            <Tag key={f.key} selectable selected={filter === f.key} color={f.color || undefined}
              onClick={() => setFilter(f.key)} style={{ flex: 'none' }}>{f.label}</Tag>
          ))}
        </div>
        <ScreenScroll pad={20}>
          {groups.map((g) => {
            const total = g.items.reduce((s, t) => s + (t.amount < 0 ? t.amount : 0), 0);
            return (
              <div key={g.day} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  padding: '0 4px 6px' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>{g.day}</span>
                  <span data-money style={{ fontSize: 12.5, color: 'var(--text-subtle)', fontWeight: 600 }}>
                    −${Math.abs(total).toFixed(2)}
                  </span>
                </div>
                <Card padded={false} style={{ padding: '6px 16px' }}>
                  {g.items.map((t) => (
                    <TransactionRow key={t.id} title={t.title} category={t.category}
                      merchant={t.merchant} subtitle={t.sub} amount={t.amount} signed={t.income}
                      meta={t.meta} onClick={() => {}} />
                  ))}
                </Card>
              </div>
            );
          })}
          {!groups.length && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40, fontSize: 14 }}>
              No transactions in this category yet.
            </div>
          )}
        </ScreenScroll>
      </>
    );
  }

  window.ActivityScreen = ActivityScreen;
})();
