import React from 'react';

const CSS = `
.spx-switch{display:inline-flex;align-items:center;gap:10px;cursor:pointer;font-family:var(--font-sans);font-size:14px;color:var(--text-body);user-select:none;}
.spx-switch input{position:absolute;opacity:0;width:0;height:0;}
.spx-switch__track{
  width:44px;height:26px;border-radius:var(--radius-pill);background:var(--neutral-300);
  position:relative;flex:none;transition:background var(--dur-fast) var(--ease-standard);
}
.spx-switch__thumb{
  position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;
  background:#fff;box-shadow:var(--shadow-sm);transition:transform var(--dur-fast) var(--ease-standard);
}
.spx-switch input:checked + .spx-switch__track{background:var(--action-primary);}
.spx-switch input:checked + .spx-switch__track .spx-switch__thumb{transform:translateX(18px);}
.spx-switch input:focus-visible + .spx-switch__track{box-shadow:var(--focus-ring);}
.spx-switch--disabled{opacity:.5;pointer-events:none;}
`;

if (typeof document !== 'undefined' && !document.getElementById('spx-switch-css')) {
  const el = document.createElement('style');
  el.id = 'spx-switch-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function Switch({ checked, onChange, label = null, disabled = false, className = '', ...rest }) {
  return (
    <label className={['spx-switch', disabled ? 'spx-switch--disabled' : '', className].filter(Boolean).join(' ')}>
      <input type="checkbox" role="switch" checked={checked} onChange={onChange} disabled={disabled} {...rest} />
      <span className="spx-switch__track"><span className="spx-switch__thumb" /></span>
      {label && <span>{label}</span>}
    </label>
  );
}
