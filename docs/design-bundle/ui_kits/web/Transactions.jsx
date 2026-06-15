/* Spendlio web — Transactions table */
(function () {
  const DS = window.SpendlioDesignSystem_5a5954;
  const { Card, CategoryIcon, MoneyAmount, Badge, Tag, Input } = DS;
  const { WIcon } = window;
  const D = window.SPENDLIO_WEB;

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'groceries', label: 'Groceries', color: '#1B6E4F' },
    { key: 'dining', label: 'Dining', color: '#BE8A30' },
    { key: 'split', label: 'Split', color: '#7C5CBF' },
    { key: 'income', label: 'Income', color: '#1B6E4F' },
  ];

  const STATUS = {
    split: { tone: 'brand', label: 'Split' },
    income: { tone: 'positive', label: 'Income' },
    recurring: { tone: 'info', label: 'Recurring' },
    cleared: { tone: 'neutral', label: 'Cleared' },
  };

  function Transactions() {
    const [filter, setFilter] = React.useState('all');
    const rows = D.txns.filter((t) =>
      filter === 'all' ? true :
      filter === 'split' ? !!t.split :
      filter === 'income' ? t.income :
      t.category === filter);

    const th = { textAlign: 'left', fontSize: 11.5, fontWeight: 700, letterSpacing: '.05em',
      textTransform: 'uppercase', color: 'var(--text-subtle)', padding: '0 16px 12px' };

    return (
      <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {FILTERS.map((f) => (
              <Tag key={f.key} selectable selected={filter === f.key} color={f.color}
                onClick={() => setFilter(f.key)}>{f.label}</Tag>
            ))}
          </div>
          <div style={{ width: 240 }}>
            <Input placeholder="Search transactions" leadingIcon={<WIcon n="search" s={17} />} />
          </div>
        </div>

        <Card padded={false}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ ...th, paddingTop: 16 }}>Transaction</th>
                <th style={{ ...th, paddingTop: 16 }}>Account</th>
                <th style={{ ...th, paddingTop: 16 }}>Date</th>
                <th style={{ ...th, paddingTop: 16 }}>Status</th>
                <th style={{ ...th, paddingTop: 16, textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const st = STATUS[t.status] || STATUS.cleared;
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <CategoryIcon category={t.category} size="sm" />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-strong)' }}>{t.title}</div>
                          {t.split && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Split with {t.split}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{t.account}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{t.date}</td>
                    <td style={{ padding: '12px 16px' }}><Badge tone={st.tone} size="sm">{st.label}</Badge></td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <MoneyAmount value={t.amount} signed={t.income} weight={700} size={14} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  window.WebTransactions = Transactions;
})();
