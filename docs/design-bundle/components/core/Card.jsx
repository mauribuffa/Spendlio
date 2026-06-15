import React from 'react';

const CSS = `
.spx-card{
  background:var(--surface-card);border:1px solid var(--border-subtle);
  border-radius:var(--radius-card);box-shadow:var(--shadow-sm);
  color:var(--text-body);overflow:hidden;
}
.spx-card--flat{box-shadow:none;}
.spx-card--raised{box-shadow:var(--shadow-md);}
.spx-card--inverse,.spx-card--inverse{background:var(--surface-inverse);border-color:transparent;color:var(--text-on-dark);}
.spx-card--brand{background:var(--surface-brand-sub);border-color:var(--green-100);}
.spx-card--interactive{cursor:pointer;transition:var(--transition-control);}
.spx-card--interactive:hover{box-shadow:var(--shadow-md);border-color:var(--border-default);}
.spx-card--interactive:active{transform:scale(0.995);}
.spx-card__pad{padding:var(--pad-card);}
.spx-card__header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px var(--pad-card);border-bottom:1px solid var(--border-subtle);}
.spx-card__title{font-family:var(--font-display);font-weight:var(--weight-bold);font-size:16px;letter-spacing:-0.01em;color:var(--text-strong);}
`;

if (typeof document !== 'undefined' && !document.getElementById('spx-card-css')) {
  const el = document.createElement('style');
  el.id = 'spx-card-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function Card({
  children,
  variant = 'default',
  padded = true,
  interactive = false,
  title = null,
  action = null,
  className = '',
  ...rest
}) {
  const cls = [
    'spx-card',
    variant !== 'default' ? `spx-card--${variant}` : '',
    interactive ? 'spx-card--interactive' : '',
    className,
  ].filter(Boolean).join(' ');
  return (
    <div className={cls} {...rest}>
      {title != null && (
        <div className="spx-card__header">
          <span className="spx-card__title">{title}</span>
          {action}
        </div>
      )}
      {padded ? <div className="spx-card__pad">{children}</div> : children}
    </div>
  );
}
