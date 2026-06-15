import React from 'react';

const CSS = `
.spx-stat{font-family:var(--font-sans);display:flex;flex-direction:column;gap:5px;}
.spx-stat__label{font-size:12px;font-weight:var(--weight-semibold);letter-spacing:.04em;text-transform:uppercase;color:var(--text-subtle);}
.spx-stat__value{font-family:var(--font-display);font-weight:var(--weight-bold);letter-spacing:-0.02em;color:var(--text-strong);line-height:1;font-variant-numeric:tabular-nums lining-nums;}
.spx-stat__delta{display:inline-flex;align-items:center;gap:4px;font-size:12.5px;font-weight:var(--weight-semibold);}
.spx-stat__delta svg{width:14px;height:14px;}
.spx-stat__delta--up{color:var(--money-positive);}
.spx-stat__delta--down{color:var(--money-negative);}
.spx-stat__delta--flat{color:var(--text-muted);}
.spx-stat__delta .cap{color:var(--text-subtle);font-weight:var(--weight-regular);}
`;

if (typeof document !== 'undefined' && !document.getElementById('spx-stat-css')) {
  const el = document.createElement('style');
  el.id = 'spx-stat-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function Stat({
  label,
  value,
  delta = null,
  deltaDirection = 'auto',
  deltaCaption = null,
  goodWhen = 'up',
  valueSize = 30,
  className = '',
  ...rest
}) {
  let dir = deltaDirection;
  if (dir === 'auto' && delta != null) {
    const n = parseFloat(String(delta).replace(/[^0-9.\-]/g, ''));
    dir = n > 0 ? 'up' : n < 0 ? 'down' : 'flat';
  }
  // Color by whether the direction is "good", not just up/down
  const good = (dir === 'up' && goodWhen === 'up') || (dir === 'down' && goodWhen === 'down');
  const toneCls = dir === 'flat' ? 'flat' : good ? 'up' : 'down';
  const arrow = dir === 'up' ? 'trending-up' : dir === 'down' ? 'trending-down' : 'minus';
  return (
    <div className={['spx-stat', className].filter(Boolean).join(' ')} {...rest}>
      <span className="spx-stat__label">{label}</span>
      <span className="spx-stat__value" style={{ fontSize: valueSize }} data-money>{value}</span>
      {delta != null && (
        <span className={`spx-stat__delta spx-stat__delta--${toneCls}`}>
          <i data-lucide={arrow}></i>
          {delta}
          {deltaCaption && <span className="cap">{deltaCaption}</span>}
        </span>
      )}
    </div>
  );
}
