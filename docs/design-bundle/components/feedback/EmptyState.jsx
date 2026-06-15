import React from 'react';

const CSS = `
.spx-empty{
  display:flex;flex-direction:column;align-items:center;text-align:center;
  font-family:var(--font-sans);padding:36px 24px;gap:6px;
}
.spx-empty__art{
  width:64px;height:64px;border-radius:var(--radius-2xl);display:flex;
  align-items:center;justify-content:center;margin-bottom:10px;
  background:var(--surface-brand-sub);color:var(--green-600);
}
.spx-empty__art svg{width:28px;height:28px;}
.spx-empty__title{font-family:var(--font-display);font-weight:var(--weight-bold);font-size:18px;color:var(--text-strong);}
.spx-empty__msg{font-size:14px;color:var(--text-muted);max-width:320px;line-height:1.5;}
.spx-empty__action{margin-top:12px;}
`;

if (typeof document !== 'undefined' && !document.getElementById('spx-empty-css')) {
  const el = document.createElement('style');
  el.id = 'spx-empty-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function EmptyState({ icon = 'inbox', title, message = null, action = null, className = '', ...rest }) {
  return (
    <div className={['spx-empty', className].filter(Boolean).join(' ')} {...rest}>
      <span className="spx-empty__art">
        {typeof icon === 'string' ? <i data-lucide={icon}></i> : icon}
      </span>
      <span className="spx-empty__title">{title}</span>
      {message && <span className="spx-empty__msg">{message}</span>}
      {action && <span className="spx-empty__action">{action}</span>}
    </div>
  );
}
