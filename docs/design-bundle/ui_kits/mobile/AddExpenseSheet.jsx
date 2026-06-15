/* Spendlio mobile — Add expense & split bottom sheet */
(function () {
  const DS = window.SpendlioDesignSystem_5a5954;
  const { AmountInput, Input, Select, SegmentedControl, Switch, Checkbox, Button, Avatar, CategoryIcon } = DS;
  const { Sheet, MIcon: I } = window;
  const D = window.SPENDLIO;

  const CATS = ['groceries', 'dining', 'transport', 'shopping', 'travel', 'subscriptions'];
  const SPLIT_PEOPLE = ['maya', 'sam', 'lee', 'ari'];

  function AddExpenseSheet({ open, onClose, onSaved, onScan }) {
    const [amount, setAmount] = React.useState('48.00');
    const [desc, setDesc] = React.useState('');
    const [cat, setCat] = React.useState('dining');
    const [split, setSplit] = React.useState(true);
    const [mode, setMode] = React.useState('even');
    const [picked, setPicked] = React.useState({ maya: true, sam: true });

    React.useEffect(() => { window.lucide && lucide.createIcons(); });

    const people = ['you', ...SPLIT_PEOPLE.filter((p) => picked[p])];
    const each = (parseFloat(amount) || 0) / Math.max(1, people.length);

    return (
      <Sheet open={open} onClose={onClose} title="Add expense">
        <div style={{ padding: '4px 20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <button onClick={onScan} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', cursor: 'pointer', border: '1px dashed var(--green-300)', background: 'var(--surface-brand-sub)',
            color: 'var(--green-800)', borderRadius: 'var(--radius-lg)', padding: '12px', fontFamily: 'var(--font-sans)',
            fontSize: 14, fontWeight: 600 }}>
            <I n="scan-line" s={18} /> Scan a receipt instead
          </button>
          <AmountInput value={amount} onChange={(e) => setAmount(e.target.value)} />

          <Input label="Description" placeholder="e.g. Dinner at Olio"
            value={desc} onChange={(e) => setDesc(e.target.value)} leadingIcon={<I n="receipt" s={18} />} />

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', marginBottom: 8 }}>Category</div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
              {CATS.map((c) => (
                <button key={c} onClick={() => setCat(c)} style={{ flex: 'none', display: 'flex',
                  flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none',
                  cursor: 'pointer', opacity: cat === c ? 1 : 0.5, transition: 'opacity var(--dur-fast)' }}>
                  <div style={{ borderRadius: 999, boxShadow: cat === c ? 'var(--ring-brand)' : 'none' }}>
                    <CategoryIcon category={c} size="lg" />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{c}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--surface-sunken)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <I n="arrow-left-right" s={18} />
              <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-strong)' }}>Split this expense</span>
            </div>
            <Switch checked={split} onChange={(e) => setSplit(e.target.checked)} />
          </div>

          {split && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SegmentedControl fullWidth value={mode} onChange={setMode}
                options={[{ value: 'even', label: 'Evenly' }, { value: 'exact', label: 'Exact' }, { value: 'pct', label: '%' }]} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px' }}>
                  <Avatar name="You" color="#1B6E4F" size="md" />
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--text-strong)' }}>You</span>
                  <span data-money style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>${each.toFixed(2)}</span>
                </div>
                {SPLIT_PEOPLE.map((p) => (
                  <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', cursor: 'pointer' }}>
                    <Checkbox round checked={!!picked[p]} onChange={(e) =>
                      setPicked((s) => ({ ...s, [p]: e.target.checked }))} />
                    <Avatar name={D.people[p].name} color={D.people[p].color} size="md" />
                    <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--text-strong)' }}>{D.people[p].name}</span>
                    {picked[p] && <span data-money style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>${each.toFixed(2)}</span>}
                  </label>
                ))}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-subtle)', textAlign: 'center' }}>
                Split evenly · {people.length} people · ${each.toFixed(2)} each
              </div>
            </div>
          )}

          <Button variant="primary" size="lg" fullWidth onClick={onSaved}
            leadingIcon={<I n="check" s={18} />}>
            {split ? 'Add & split' : 'Add expense'}
          </Button>
        </div>
      </Sheet>
    );
  }

  window.AddExpenseSheet = AddExpenseSheet;
})();
