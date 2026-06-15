import React from 'react';

const CSS = `
.spx-tag{
  display:inline-flex;align-items:center;gap:6px;font-family:var(--font-sans);
  font-weight:var(--weight-medium);font-size:13px;line-height:1;
  padding:7px 12px;border-radius:var(--radius-pill);cursor:pointer;
  background:var(--surface-card);color:var(--text-body);
  border:1px solid var(--border-default);transition:var(--transition-control);
}
.spx-tag:hover{background:var(--surface-sunken);}
.spx-tag:focus-visible{outline:none;box-shadow:var(--focus-ring);}
.spx-tag[aria-pressed="true"]{background:var(--surface-brand-sub);border-color:var(--green-300);color:var(--green-800);font-weight:var(--weight-semibold);}
.spx-tag__dot{width:9px;height:9px;border-radius:50%;flex:none;}
.spx-tag__x{display:inline-flex;margin-right:-3px;opacity:.6;}
.spx-tag__x:hover{opacity:1;}
.spx-tag svg{width:14px;height:14px;}
.spx-tag--static{cursor:default;}
.spx-tag--static:hover{background:var(--surface-card);}
`;

if (typeof document !== 'undefined' && !document.getElementById('spx-tag-css')) {
  const el = document.createElement('style');
  el.id = 'spx-tag-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function Tag({
  children,
  selected = false,
  selectable = false,
  color = null,
  icon = null,
  onRemove = null,
  className = '',
  ...rest
}) {
  const cls = ['spx-tag', !selectable && !onRemove ? 'spx-tag--static' : '', className]
    .filter(Boolean).join(' ');
  return (
    <button type="button" className={cls}
      aria-pressed={selectable ? selected : undefined} {...rest}>
      {color && <span className="spx-tag__dot" style={{ background: color }} />}
      {icon}
      {children}
      {onRemove && (
        <span className="spx-tag__x" onClick={(e) => { e.stopPropagation(); onRemove(e); }} aria-label="Remove">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
               strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </span>
      )}
    </button>
  );
}
