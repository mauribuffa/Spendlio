/* Spendlio web — Add expense + split modal, and Receipt scan (OCR) modal */
(function () {
  const DS = window.SpendlioDesignSystem_5a5954;
  const { AmountInput, Input, Select, SegmentedControl, Switch, Checkbox, Button, Avatar, CategoryIcon, MoneyAmount, Badge } = DS;
  const { WebModal, WIcon } = window;
  const D = window.SPENDLIO_WEB;

  const CATS = ['groceries', 'dining', 'transport', 'shopping', 'travel', 'subscriptions'];
  const PEOPLE = D.people.map((p) => p.name);

  function AddExpenseModal({ open, onClose, onSaved, onScan }) {
    const [amount, setAmount] = React.useState('48.00');
    const [desc, setDesc] = React.useState('');
    const [cat, setCat] = React.useState('dining');
    const [split, setSplit] = React.useState(true);
    const [mode, setMode] = React.useState('even');
    const [picked, setPicked] = React.useState({ 'Maya Okafor': true, 'Sam Reed': true });
    React.useEffect(() => { if (open) window.lucide && lucide.createIcons(); });

    const people = ['You', ...PEOPLE.filter((p) => picked[p])];
    const each = (parseFloat(amount) || 0) / Math.max(1, people.length);

    return (
      <WebModal open={open} onClose={onClose} title="Add expense" width={480}>
        <div style={{ padding: '4px 22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button onClick={onScan} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', cursor: 'pointer', border: '1px dashed var(--green-300)', background: 'var(--surface-brand-sub)',
            color: 'var(--green-800)', borderRadius: 'var(--radius-lg)', padding: 12, fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600 }}>
            <WIcon n="scan-line" s={18} /> Scan a receipt instead
          </button>
          <AmountInput value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input label="Description" placeholder="e.g. Dinner at Olio" value={desc} onChange={(e) => setDesc(e.target.value)} leadingIcon={<WIcon n="receipt" s={18} />} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', marginBottom: 8 }}>Category</div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
              {CATS.map((c) => (
                <button key={c} onClick={() => setCat(c)} style={{ flex: 'none', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer',
                  opacity: cat === c ? 1 : 0.5, transition: 'opacity var(--dur-fast)' }}>
                  <div style={{ borderRadius: 999, boxShadow: cat === c ? 'var(--ring-brand)' : 'none' }}><CategoryIcon category={c} size="lg" /></div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{c}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <WIcon n="arrow-left-right" s={18} />
              <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-strong)' }}>Split this expense</span>
            </div>
            <Switch checked={split} onChange={(e) => setSplit(e.target.checked)} />
          </div>
          {split && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <SegmentedControl fullWidth value={mode} onChange={setMode}
                options={[{ value: 'even', label: 'Evenly' }, { value: 'exact', label: 'Exact' }, { value: 'pct', label: '%' }]} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 4px' }}>
                  <Avatar name="You" color="#1B6E4F" size="sm" />
                  <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: 'var(--text-strong)' }}>You</span>
                  <span data-money style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>${each.toFixed(2)}</span>
                </div>
                {D.people.map((p) => (
                  <label key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 4px', cursor: 'pointer' }}>
                    <Checkbox round checked={!!picked[p.name]} onChange={(e) => setPicked((s) => ({ ...s, [p.name]: e.target.checked }))} />
                    <Avatar name={p.name} color={p.color} size="sm" />
                    <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: 'var(--text-strong)' }}>{p.name}</span>
                    {picked[p.name] && <span data-money style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>${each.toFixed(2)}</span>}
                  </label>
                ))}
              </div>
            </div>
          )}
          <Button variant="primary" size="lg" fullWidth onClick={onSaved} leadingIcon={<WIcon n="check" s={18} />}>
            {split ? 'Add & split' : 'Add expense'}
          </Button>
        </div>
      </WebModal>
    );
  }

  const ITEMS = [
    { name: 'Margherita pizza', cat: 'dining', amount: 16.00 },
    { name: 'Caesar salad', cat: 'dining', amount: 12.50 },
    { name: 'Sparkling water', cat: 'dining', amount: 4.00 },
    { name: 'Tiramisu', cat: 'dining', amount: 9.00 },
  ];

  function ReceiptScanModal({ open, onClose, onAdd }) {
    React.useEffect(() => { if (open) window.lucide && lucide.createIcons(); });
    const total = ITEMS.reduce((s, i) => s + i.amount, 0);
    return (
      <WebModal open={open} onClose={onClose} title="Scan receipt" width={480}>
        <div style={{ padding: '4px 22px 24px' }}>
          <div style={{ background: 'var(--surface-sunken)', borderRadius: 'var(--radius-xl)', padding: '22px 0', display: 'flex', justifyContent: 'center', position: 'relative' }}>
            <div style={{ transform: 'rotate(-2deg)', background: '#fff', borderRadius: 8, boxShadow: 'var(--shadow-lg)', padding: '18px 20px', width: 210, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--neutral-700)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, letterSpacing: '.04em', marginBottom: 8 }}>OLIO TRATTORIA</div>
              <div style={{ textAlign: 'center', color: 'var(--text-subtle)', marginBottom: 12 }}>May 25, 2026 · 8:14 PM</div>
              {ITEMS.map((it) => (
                <div key={it.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{it.name}</span><span>{it.amount.toFixed(2)}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px dashed var(--neutral-300)', margin: '10px 0 8px' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>TOTAL</span><span>$49.00</span></div>
            </div>
            <div style={{ position: 'absolute', top: 14, right: 14 }}><Badge tone="positive" dot>Scanned</Badge></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '18px 0 12px', color: 'var(--green-700)' }}>
            <WIcon n="sparkles" s={16} /><span style={{ fontSize: 13.5, fontWeight: 600 }}>Spendlio AI read 4 items · 98% confidence</span>
          </div>
          <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xs)', padding: '6px 14px', marginBottom: 14 }}>
            {ITEMS.map((it, i) => (
              <div key={it.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: i ? '1px solid var(--border-subtle)' : 'none' }}>
                <CategoryIcon category={it.cat} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-strong)' }}>{it.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{it.cat}</div>
                </div>
                <MoneyAmount value={-it.amount} weight={700} size={14} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" size="lg" style={{ flex: 1 }} leadingIcon={<WIcon n="arrow-left-right" s={18} />}>Split</Button>
            <Button variant="primary" size="lg" style={{ flex: 1 }} onClick={onAdd} leadingIcon={<WIcon n="check" s={18} />}>Add 4 items</Button>
          </div>
        </div>
      </WebModal>
    );
  }

  Object.assign(window, { WebAddExpenseModal: AddExpenseModal, WebReceiptScanModal: ReceiptScanModal });
})();
