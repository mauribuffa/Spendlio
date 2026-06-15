/* Spendlio mobile — shared screen chrome. Exposes helpers on window. */
(function () {
  const DS = window.SpendlioDesignSystem_5a5954;
  const { IconButton, Avatar } = DS;
  const I = ({ n, s }) => <i data-lucide={n} style={{ width: s, height: s }}></i>;

  // Large branded screen header. paddingTop clears the iOS status bar.
  function ScreenHeader({ title, eyebrow, right, onBack }) {
    return (
      <div style={{ padding: '58px 20px 12px', flex: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {onBack && (
              <IconButton variant="solid" size="sm" label="Back" onClick={onBack}
                icon={<I n="chevron-left" s={20} />} />
            )}
            <div style={{ minWidth: 0 }}>
              {eyebrow && <div className="ds-eyebrow" style={{ marginBottom: 2 }}>{eyebrow}</div>}
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28,
                letterSpacing: '-0.02em', color: 'var(--text-strong)', lineHeight: 1.05 }}>{title}</div>
            </div>
          </div>
          {right}
        </div>
      </div>
    );
  }

  function SectionHeader({ children, action, onAction }) {
    return (
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '4px 4px 10px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17,
          letterSpacing: '-0.01em', color: 'var(--text-strong)' }}>{children}</span>
        {action && (
          <button onClick={onAction} style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-brand)', fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
            {action}
          </button>
        )}
      </div>
    );
  }

  // Scroll region between header and tab bar.
  function ScreenScroll({ children, pad = 20, bottom = 96 }) {
    return (
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: `4px ${pad}px ${bottom}px`, WebkitOverflowScrolling: 'touch' }}>
        {children}
      </div>
    );
  }

  // Bottom sheet modal that slides up within the device.
  function Sheet({ open, onClose, title, children, height = '88%' }) {
    return (
      <div aria-hidden={!open} style={{ position: 'absolute', inset: 0, zIndex: 80,
        pointerEvents: open ? 'auto' : 'none' }}>
        <div onClick={onClose} style={{ position: 'absolute', inset: 0,
          background: 'var(--surface-overlay)', opacity: open ? 1 : 0,
          transition: 'opacity var(--dur-base) var(--ease-standard)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height,
          background: 'var(--surface-card)', borderRadius: 'var(--radius-sheet) var(--radius-sheet) 0 0',
          boxShadow: 'var(--shadow-xl)', transform: open ? 'translateY(0)' : 'translateY(102%)',
          transition: 'transform var(--dur-slow) var(--ease-entrance)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '10px 0 4px', flex: 'none' }}>
            <div style={{ width: 38, height: 5, borderRadius: 999, background: 'var(--neutral-300)' }} />
          </div>
          {title && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 20px 12px', flex: 'none' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20,
                color: 'var(--text-strong)', letterSpacing: '-0.01em' }}>{title}</span>
              <IconButton variant="ghost" size="sm" label="Close" onClick={onClose}
                icon={<I n="x" s={20} />} />
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>{children}</div>
        </div>
      </div>
    );
  }

  Object.assign(window, { ScreenHeader, SectionHeader, ScreenScroll, Sheet, MIcon: I });
})();
