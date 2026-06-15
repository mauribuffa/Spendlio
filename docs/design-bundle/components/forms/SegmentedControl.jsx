import React from 'react';

const CSS = `
.spx-seg{
  display:inline-flex;background:var(--surface-inset);border-radius:var(--radius-pill);
  padding:3px;gap:2px;font-family:var(--font-sans);position:relative;
}
.spx-seg--full{display:flex;width:100%;}
.spx-seg__opt{
  flex:1;border:none;background:none;cursor:pointer;white-space:nowrap;
  padding:7px 16px;border-radius:var(--radius-pill);font-size:13px;
  font-weight:var(--weight-semibold);color:var(--text-muted);
  transition:var(--transition-control);z-index:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;
}
.spx-seg__opt:hover{color:var(--text-strong);}
.spx-seg__opt[aria-selected="true"]{color:var(--green-800);}
.spx-seg__opt:focus-visible{outline:none;box-shadow:var(--focus-ring);}
.spx-seg__thumb{
  position:absolute;top:3px;bottom:3px;border-radius:var(--radius-pill);
  background:var(--surface-card);box-shadow:var(--shadow-sm);
  transition:left var(--dur-base) var(--ease-standard),width var(--dur-base) var(--ease-standard);z-index:0;
}
.spx-seg__opt svg{width:15px;height:15px;}
`;

if (typeof document !== 'undefined' && !document.getElementById('spx-seg-css')) {
  const el = document.createElement('style');
  el.id = 'spx-seg-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function SegmentedControl({ options = [], value, onChange, fullWidth = false, className = '' }) {
  const ref = React.useRef(null);
  const [thumb, setThumb] = React.useState(null);
  const idx = options.findIndex((o) => (o.value ?? o) === value);

  React.useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const btn = root.querySelectorAll('.spx-seg__opt')[idx < 0 ? 0 : idx];
    if (btn) setThumb({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [idx, options.length, fullWidth]);

  return (
    <div ref={ref} className={['spx-seg', fullWidth ? 'spx-seg--full' : '', className].filter(Boolean).join(' ')} role="tablist">
      {thumb && <span className="spx-seg__thumb" style={{ left: thumb.left, width: thumb.width }} />}
      {options.map((o, i) => {
        const val = o.value ?? o;
        const label = o.label ?? o;
        return (
          <button key={i} type="button" role="tab" aria-selected={val === value}
            className="spx-seg__opt" onClick={() => onChange && onChange(val)}>
            {o.icon}{label}
          </button>
        );
      })}
    </div>
  );
}
