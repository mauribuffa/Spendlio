import React from 'react';

const CSS = `
.spx-select{display:flex;flex-direction:column;gap:6px;font-family:var(--font-sans);}
.spx-select__label{font-size:13px;font-weight:var(--weight-semibold);color:var(--text-body);}
.spx-select__box{
  position:relative;display:flex;align-items:center;background:var(--surface-card);
  border:1px solid var(--border-default);border-radius:var(--radius-input);height:44px;
  transition:var(--transition-control);
}
.spx-select__box:focus-within{border-color:var(--border-focus);box-shadow:var(--focus-ring);}
.spx-select select{
  appearance:none;-webkit-appearance:none;border:none;outline:none;background:none;
  font:inherit;font-size:15px;color:var(--text-strong);padding:0 40px 0 14px;height:100%;
  width:100%;cursor:pointer;
}
.spx-select__chevron{position:absolute;right:14px;pointer-events:none;color:var(--text-subtle);display:inline-flex;}
.spx-select__chevron svg{width:18px;height:18px;}
`;

if (typeof document !== 'undefined' && !document.getElementById('spx-select-css')) {
  const el = document.createElement('style');
  el.id = 'spx-select-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function Select({ label = null, options = [], value, onChange, placeholder = null, className = '', ...rest }) {
  return (
    <div className={['spx-select', className].filter(Boolean).join(' ')}>
      {label && <label className="spx-select__label">{label}</label>}
      <div className="spx-select__box">
        <select value={value} onChange={onChange} {...rest}>
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((o, i) => {
            const val = o.value ?? o;
            const lab = o.label ?? o;
            return <option key={i} value={val}>{lab}</option>;
          })}
        </select>
        <span className="spx-select__chevron">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </span>
      </div>
    </div>
  );
}
