import React from 'react';

const CSS = `
.spx-field{display:flex;flex-direction:column;gap:6px;font-family:var(--font-sans);}
.spx-field__label{font-size:13px;font-weight:var(--weight-semibold);color:var(--text-body);}
.spx-field__hint{font-size:12px;color:var(--text-subtle);}
.spx-field__error{font-size:12px;color:var(--negative-600);font-weight:var(--weight-medium);}
.spx-input{
  display:flex;align-items:center;gap:9px;background:var(--surface-card);
  border:1px solid var(--border-default);border-radius:var(--radius-input);
  padding:0 14px;height:44px;transition:var(--transition-control);color:var(--text-strong);
}
.spx-input:focus-within{border-color:var(--border-focus);box-shadow:var(--focus-ring);}
.spx-input--error{border-color:var(--negative-500);}
.spx-input--error:focus-within{box-shadow:var(--ring-error);}
.spx-input input{flex:1;border:none;outline:none;background:none;font:inherit;font-size:15px;color:var(--text-strong);min-width:0;}
.spx-input input::placeholder{color:var(--text-disabled);}
.spx-input__icon{display:inline-flex;color:var(--text-subtle);flex:none;}
.spx-input__icon svg{width:18px;height:18px;}
.spx-input--disabled{background:var(--surface-sunken);opacity:.7;pointer-events:none;}
`;

if (typeof document !== 'undefined' && !document.getElementById('spx-input-css')) {
  const el = document.createElement('style');
  el.id = 'spx-input-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function Input({
  label = null,
  hint = null,
  error = null,
  leadingIcon = null,
  trailingIcon = null,
  disabled = false,
  id,
  className = '',
  ...rest
}) {
  const inputId = id || (label ? 'in-' + label.replace(/\s+/g, '-').toLowerCase() : undefined);
  const boxCls = ['spx-input', error ? 'spx-input--error' : '', disabled ? 'spx-input--disabled' : '']
    .filter(Boolean).join(' ');
  return (
    <div className={['spx-field', className].filter(Boolean).join(' ')}>
      {label && <label className="spx-field__label" htmlFor={inputId}>{label}</label>}
      <div className={boxCls}>
        {leadingIcon && <span className="spx-input__icon">{leadingIcon}</span>}
        <input id={inputId} disabled={disabled} aria-invalid={!!error} {...rest} />
        {trailingIcon && <span className="spx-input__icon">{trailingIcon}</span>}
      </div>
      {error ? <span className="spx-field__error">{error}</span>
             : hint && <span className="spx-field__hint">{hint}</span>}
    </div>
  );
}
