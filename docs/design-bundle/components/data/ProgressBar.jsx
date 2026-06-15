import React from 'react';

const CSS = `
.spx-prog{font-family:var(--font-sans);display:flex;flex-direction:column;gap:8px;}
.spx-prog__top{display:flex;align-items:baseline;justify-content:space-between;gap:8px;}
.spx-prog__label{font-size:13.5px;font-weight:var(--weight-semibold);color:var(--text-body);flex:1 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.spx-prog__val{font-size:12.5px;color:var(--text-muted);font-variant-numeric:tabular-nums;white-space:nowrap;flex:none;}
.spx-prog__track{height:8px;border-radius:var(--radius-pill);background:var(--surface-inset);overflow:hidden;}
.spx-prog__track--lg{height:12px;}
.spx-prog__fill{height:100%;border-radius:var(--radius-pill);transition:width var(--dur-slow) var(--ease-entrance);}
`;

if (typeof document !== 'undefined' && !document.getElementById('spx-prog-css')) {
  const el = document.createElement('style');
  el.id = 'spx-prog-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function ProgressBar({
  value = 0,
  max = 100,
  label = null,
  valueLabel = null,
  color = null,
  size = 'md',
  showOver = true,
  className = '',
  ...rest
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const over = pct > 100;
  const clamped = Math.max(0, Math.min(100, pct));
  const fill = color || (over && showOver ? 'var(--negative-500)' : 'var(--action-primary)');
  return (
    <div className={['spx-prog', className].filter(Boolean).join(' ')} {...rest}>
      {(label || valueLabel) && (
        <div className="spx-prog__top">
          {label && <span className="spx-prog__label">{label}</span>}
          {valueLabel && <span className="spx-prog__val" style={over ? { color: 'var(--negative-600)', fontWeight: 600 } : undefined}>{valueLabel}</span>}
        </div>
      )}
      <div className={['spx-prog__track', size === 'lg' ? 'spx-prog__track--lg' : ''].filter(Boolean).join(' ')}>
        <div className="spx-prog__fill" style={{ width: clamped + '%', background: fill }} />
      </div>
    </div>
  );
}
