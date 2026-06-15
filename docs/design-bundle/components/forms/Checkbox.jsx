import React from 'react';

const CSS = `
.spx-check{display:inline-flex;align-items:flex-start;gap:10px;cursor:pointer;font-family:var(--font-sans);font-size:14px;color:var(--text-body);user-select:none;line-height:1.4;}
.spx-check input{position:absolute;opacity:0;width:0;height:0;}
.spx-check__box{
  width:20px;height:20px;border-radius:6px;border:1.5px solid var(--border-strong);
  background:var(--surface-card);flex:none;display:inline-flex;align-items:center;justify-content:center;
  transition:var(--transition-control);margin-top:1px;color:#fff;
}
.spx-check__box svg{width:13px;height:13px;opacity:0;transform:scale(.6);transition:var(--transition-control);}
.spx-check input:checked + .spx-check__box{background:var(--action-primary);border-color:var(--action-primary);}
.spx-check input:checked + .spx-check__box svg{opacity:1;transform:scale(1);}
.spx-check input:focus-visible + .spx-check__box{box-shadow:var(--focus-ring);}
.spx-check--round .spx-check__box{border-radius:50%;}
.spx-check--disabled{opacity:.5;pointer-events:none;}
`;

if (typeof document !== 'undefined' && !document.getElementById('spx-check-css')) {
  const el = document.createElement('style');
  el.id = 'spx-check-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function Checkbox({ checked, onChange, label = null, round = false, disabled = false, className = '', ...rest }) {
  return (
    <label className={['spx-check', round ? 'spx-check--round' : '', disabled ? 'spx-check--disabled' : '', className].filter(Boolean).join(' ')}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} {...rest} />
      <span className="spx-check__box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      </span>
      {label && <span>{label}</span>}
    </label>
  );
}
