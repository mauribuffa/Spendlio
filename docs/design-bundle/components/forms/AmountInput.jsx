import React from 'react';

const CSS = `
.spx-amount{
  display:flex;align-items:center;justify-content:center;gap:4px;
  font-family:var(--font-display);color:var(--text-strong);
  background:var(--surface-sunken);border-radius:var(--radius-lg);
  padding:18px 24px;border:1px solid transparent;transition:var(--transition-control);
}
.spx-amount:focus-within{background:var(--surface-card);border-color:var(--border-focus);box-shadow:var(--focus-ring);}
.spx-amount__cur{font-size:28px;font-weight:var(--weight-medium);color:var(--text-muted);align-self:flex-start;margin-top:6px;}
.spx-amount input{
  border:none;outline:none;background:none;font:inherit;font-weight:var(--weight-bold);
  font-size:48px;letter-spacing:-0.02em;color:var(--text-strong);text-align:center;
  width:100%;max-width:320px;font-variant-numeric:tabular-nums lining-nums;
}
.spx-amount input::placeholder{color:var(--text-disabled);}
.spx-amount--compact{padding:0 14px;height:44px;border:1px solid var(--border-default);background:var(--surface-card);border-radius:var(--radius-input);}
.spx-amount--compact .spx-amount__cur{font-size:16px;margin-top:0;font-family:var(--font-sans);}
.spx-amount--compact input{font-size:18px;text-align:left;}
`;

if (typeof document !== 'undefined' && !document.getElementById('spx-amount-css')) {
  const el = document.createElement('style');
  el.id = 'spx-amount-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function AmountInput({
  value,
  onChange,
  currency = '$',
  placeholder = '0.00',
  size = 'hero',
  className = '',
  ...rest
}) {
  const cls = ['spx-amount', size === 'compact' ? 'spx-amount--compact' : '', className]
    .filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <span className="spx-amount__cur">{currency}</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        data-money
        {...rest}
      />
    </div>
  );
}
