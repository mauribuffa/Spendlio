import React from 'react';

const CSS = `
.spx-toast{
  display:flex;align-items:center;gap:12px;font-family:var(--font-sans);
  background:var(--surface-inverse);color:var(--text-on-dark);
  border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);
  padding:13px 16px;max-width:380px;
}
.spx-toast__icon{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;flex:none;}
.spx-toast__icon svg{width:15px;height:15px;}
.spx-toast--success .spx-toast__icon{background:var(--green-500);color:#fff;}
.spx-toast--error .spx-toast__icon{background:var(--negative-500);color:#fff;}
.spx-toast--info .spx-toast__icon{background:var(--info-500);color:#fff;}
.spx-toast__body{flex:1;min-width:0;}
.spx-toast__title{font-size:14px;font-weight:var(--weight-semibold);}
.spx-toast__msg{font-size:12.5px;opacity:.78;margin-top:1px;}
.spx-toast__action{background:none;border:none;color:var(--green-200);font:inherit;font-weight:var(--weight-semibold);font-size:13px;cursor:pointer;flex:none;padding:4px 6px;border-radius:var(--radius-sm);}
.spx-toast__action:hover{color:#fff;}
`;

if (typeof document !== 'undefined' && !document.getElementById('spx-toast-css')) {
  const el = document.createElement('style');
  el.id = 'spx-toast-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const ICONS = { success: 'check', error: 'x', info: 'info' };

export function Toast({ title, message = null, tone = 'success', actionLabel = null, onAction = null, className = '', ...rest }) {
  return (
    <div className={['spx-toast', `spx-toast--${tone}`, className].filter(Boolean).join(' ')} role="status" {...rest}>
      <span className="spx-toast__icon"><i data-lucide={ICONS[tone] || 'check'}></i></span>
      <span className="spx-toast__body">
        <span className="spx-toast__title">{title}</span>
        {message && <div className="spx-toast__msg">{message}</div>}
      </span>
      {actionLabel && <button className="spx-toast__action" onClick={onAction}>{actionLabel}</button>}
    </div>
  );
}
