/* Spendlio web — shared dashboard chrome (sidebar, topbar, charts) */
(function () {
  const DS = window.SpendlioDesignSystem_5a5954;
  const { Avatar, Button, Input } = DS;
  const WIcon = ({ n, s = 19 }) => <i data-lucide={n} style={{ width: s, height: s }}></i>;

  const NAV = [
    { key: 'overview', label: 'Overview', icon: 'layout-dashboard' },
    { key: 'transactions', label: 'Transactions', icon: 'arrow-left-right' },
    { key: 'accounts', label: 'Accounts', icon: 'wallet' },
    { key: 'budgets', label: 'Budgets', icon: 'chart-pie' },
    { key: 'split', label: 'Split & settle', icon: 'users' },
    { key: 'assistant', label: 'Assistant', icon: 'sparkles' },
    { key: 'insights', label: 'Insights', icon: 'trending-up' },
  ];

  function Sidebar({ active, onNav }) {
    return (
      <aside style={{ width: 248, flex: 'none', background: 'var(--surface-card)',
        borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column',
        padding: '20px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '4px 8px 22px' }}>
          <img src="../../assets/logo-mark.svg" width="30" height="30" alt="" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20,
            letterSpacing: '-0.02em', color: 'var(--green-900)' }}>Spendlio</span>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {NAV.map((n) => {
            const on = active === n.key;
            return (
              <button key={n.key} onClick={() => onNav(n.key)} style={{ display: 'flex', alignItems: 'center',
                gap: 11, padding: '10px 12px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                background: on ? 'var(--surface-brand-sub)' : 'transparent',
                color: on ? 'var(--green-800)' : 'var(--text-muted)', fontFamily: 'var(--font-sans)',
                fontSize: 14, fontWeight: on ? 600 : 500, transition: 'var(--transition-colors)' }}>
                <WIcon n={n.icon} s={18} /> {n.label}
              </button>
            );
          })}
        </nav>
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: 'var(--green-900)', borderRadius: 'var(--radius-lg)', padding: 14, color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
              <WIcon n="sparkles" s={15} /> Ask Spendlio AI
            </div>
            <div style={{ fontSize: 12, color: 'var(--green-200)', marginTop: 4, lineHeight: 1.4 }}>
              "How much did I spend on dining in May?"
            </div>
          </div>
          <button onClick={() => onNav('settings')} style={{ display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 8px', borderRadius: 'var(--radius-md)', border: 'none', background: active === 'settings' ? 'var(--surface-sunken)' : 'transparent',
            cursor: 'pointer', textAlign: 'left', transition: 'var(--transition-colors)' }}>
            <Avatar name="Alex Rivera" size="sm" />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-strong)' }}>Alex Rivera</span>
              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-subtle)' }}>alex@hey.com</span>
            </span>
          </button>
        </div>
      </aside>
    );
  }

  function Topbar({ title, subtitle, onAdd, onScan }) {
    return (
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
        padding: '20px 28px', borderBottom: '1px solid var(--border-subtle)', flex: 'none',
        background: 'rgba(250,250,247,0.8)', backdropFilter: 'blur(8px)' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24,
            letterSpacing: '-0.02em', color: 'var(--text-strong)', margin: 0 }}>{title}</h1>
          {subtitle && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 220 }}>
            <Input placeholder="Search" leadingIcon={<WIcon n="search" s={17} />} />
          </div>
          {onScan && <Button variant="secondary" leadingIcon={<WIcon n="scan-line" s={17} />} onClick={onScan}>Scan</Button>}
          <Button variant="primary" leadingIcon={<WIcon n="plus" s={17} />} onClick={onAdd}>Add expense</Button>
        </div>
      </header>
    );
  }

  // Centered modal dialog (scrim + rounded-2xl panel). Web analogue of the iOS bottom sheet.
  function Modal({ open, onClose, title, children, width = 460 }) {
    if (!open) return null;
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 100, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'var(--surface-overlay)',
          animation: 'spx-fade var(--dur-base) var(--ease-standard)' }} />
        <div role="dialog" style={{ position: 'relative', width, maxWidth: '100%', maxHeight: '90%',
          background: 'var(--surface-card)', borderRadius: 'var(--radius-sheet)', boxShadow: 'var(--shadow-xl)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'spx-pop var(--dur-slow) var(--ease-entrance)' }}>
          {title != null && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 22px 14px', flex: 'none' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20,
                color: 'var(--text-strong)', letterSpacing: '-0.01em' }}>{title}</span>
              <button onClick={onClose} aria-label="Close" style={{ cursor: 'pointer', border: 'none',
                background: 'var(--surface-sunken)', borderRadius: 999, width: 32, height: 32, display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <WIcon n="x" s={18} />
              </button>
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
        </div>
      </div>
    );
  }

  // Donut via conic-gradient, hollow center
  function Donut({ data, size = 168, thickness = 26, total, centerLabel, centerValue }) {
    const sum = total ?? data.reduce((s, d) => s + d.value, 0);
    let acc = 0;
    const stops = data.map((d) => {
      const start = (acc / sum) * 360; acc += d.value;
      const end = (acc / sum) * 360;
      return `${d.color} ${start}deg ${end}deg`;
    }).join(', ');
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', position: 'relative', flex: 'none',
        background: `conic-gradient(${stops})` }}>
        <div style={{ position: 'absolute', inset: thickness, borderRadius: '50%', background: 'var(--surface-card)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-subtle)', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' }}>{centerLabel}</div>
          <div data-money style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24,
            color: 'var(--text-strong)', letterSpacing: '-0.01em' }}>{centerValue}</div>
        </div>
      </div>
    );
  }

  // Monthly spend bar chart (divs only)
  function BarChart({ months, height = 150 }) {
    const max = Math.max(...months.map((m) => m.spend));
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height }}>
        {months.map((m, i) => {
          const last = i === months.length - 1;
          return (
            <div key={m.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%' }}>
              <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                <div style={{ width: '62%', maxWidth: 38, height: (m.spend / max) * 100 + '%',
                  borderRadius: '8px 8px 4px 4px',
                  background: last ? 'var(--green-600)' : 'var(--green-200)',
                  boxShadow: last ? 'var(--shadow-brand)' : 'none', position: 'relative' }}>
                  {last && <div style={{ position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)',
                    fontSize: 11.5, fontWeight: 700, color: 'var(--green-800)', whiteSpace: 'nowrap' }} data-money>$2.5k</div>}
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: last ? 700 : 500, color: last ? 'var(--text-strong)' : 'var(--text-subtle)' }}>{m.m}</span>
            </div>
          );
        })}
      </div>
    );
  }

  Object.assign(window, { WebSidebar: Sidebar, WebTopbar: Topbar, WebModal: Modal, WebDonut: Donut, WebBarChart: BarChart, WIcon });
})();
