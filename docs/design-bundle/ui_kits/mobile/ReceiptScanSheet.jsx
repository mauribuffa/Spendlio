/* Spendlio mobile — Receipt scan + OCR extraction sheet */
(function () {
  const DS = window.SpendlioDesignSystem_5a5954;
  const { CategoryIcon, Badge, Button, MoneyAmount } = DS;
  const { Sheet, MIcon: I } = window;

  const ITEMS = [
    { name: 'Margherita pizza', cat: 'dining', amount: 16.00 },
    { name: 'Caesar salad', cat: 'dining', amount: 12.50 },
    { name: 'Sparkling water', cat: 'dining', amount: 4.00 },
    { name: 'Tiramisu', cat: 'dining', amount: 9.00 },
  ];

  function ReceiptStub() {
    return (
      <div style={{ transform: 'rotate(-2.5deg)', background: '#fff', borderRadius: 8,
        boxShadow: 'var(--shadow-lg)', padding: '18px 20px', width: 210, margin: '0 auto',
        fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--neutral-700)',
        border: '1px solid var(--border-subtle)',
        WebkitMaskImage: 'radial-gradient(circle at 6px 50%, transparent 0 4px, #000 4px) left/12px 100% repeat-y, radial-gradient(circle at calc(100% - 6px) 50%, transparent 0 4px, #000 4px) right/12px 100% repeat-y, linear-gradient(#000,#000)',
        WebkitMaskComposite: 'source-in' }}>
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, letterSpacing: '.04em', marginBottom: 8 }}>OLIO TRATTORIA</div>
        <div style={{ textAlign: 'center', color: 'var(--text-subtle)', marginBottom: 12 }}>May 25, 2026 · 8:14 PM</div>
        {ITEMS.map((it) => (
          <div key={it.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{it.name}</span>
            <span>{it.amount.toFixed(2)}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px dashed var(--neutral-300)', margin: '10px 0 8px' }}></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
          <span>TOTAL</span><span>$49.00</span>
        </div>
      </div>
    );
  }

  function ReceiptScanSheet({ open, onClose, onAdd, onSplit }) {
    React.useEffect(() => { if (open) window.lucide && lucide.createIcons(); });
    const total = ITEMS.reduce((s, i) => s + i.amount, 0);

    return (
      <Sheet open={open} onClose={onClose} title="Scan receipt">
        <div style={{ padding: '8px 20px 24px' }}>
          <div style={{ background: 'var(--surface-sunken)', borderRadius: 'var(--radius-xl)',
            padding: '24px 0 26px', position: 'relative', overflow: 'hidden' }}>
            <ReceiptStub />
            <div style={{ position: 'absolute', top: 14, right: 14 }}>
              <Badge tone="positive" dot>Scanned</Badge>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '18px 0 12px',
            color: 'var(--green-700)' }}>
            <I n="sparkles" s={16} />
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>Spendlio AI read 4 items · 98% confidence</span>
          </div>

          <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-xs)', padding: '6px 14px', marginBottom: 8 }}>
            {ITEMS.map((it, i) => (
              <div key={it.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0',
                borderTop: i ? '1px solid var(--border-subtle)' : 'none' }}>
                <CategoryIcon category={it.cat} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-strong)' }}>{it.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{it.cat}</div>
                </div>
                <MoneyAmount value={-it.amount} weight={700} size={14} />
                <I n="chevron-right" s={16} />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 6px 18px' }}>
            <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>Detected total</span>
            <MoneyAmount value={total} tone="neutral" display size={22} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" size="lg" onClick={onSplit}
              leadingIcon={<I n="arrow-left-right" s={18} />} style={{ flex: 1 }}>Split</Button>
            <Button variant="primary" size="lg" onClick={onAdd}
              leadingIcon={<I n="check" s={18} />} style={{ flex: 1 }}>Add 4 items</Button>
          </div>
        </div>
      </Sheet>
    );
  }

  window.ReceiptScanSheet = ReceiptScanSheet;
})();
