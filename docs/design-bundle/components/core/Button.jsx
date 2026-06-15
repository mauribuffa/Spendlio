import React from 'react';

const CSS = `
.spx-btn{
  display:inline-flex;align-items:center;justify-content:center;
  font-family:var(--font-sans);font-weight:var(--weight-semibold);
  border-radius:var(--radius-pill);border:1px solid transparent;
  cursor:pointer;white-space:nowrap;text-decoration:none;
  transition:var(--transition-control);user-select:none;line-height:1;
}
.spx-btn:focus-visible{outline:none;box-shadow:var(--focus-ring);}
.spx-btn:active{transform:scale(var(--press-scale));}
.spx-btn[disabled],.spx-btn[aria-disabled="true"]{opacity:.5;pointer-events:none;}
.spx-btn--sm{height:32px;padding:0 14px;font-size:13px;gap:6px;}
.spx-btn--md{height:40px;padding:0 18px;font-size:14px;gap:7px;}
.spx-btn--lg{height:48px;padding:0 24px;font-size:15px;gap:8px;}
.spx-btn--full{width:100%;}

.spx-btn--primary{background:var(--action-primary);color:var(--text-on-brand);box-shadow:var(--shadow-brand);}
.spx-btn--primary:hover{background:var(--action-primary-hover);}
.spx-btn--primary:active{background:var(--action-primary-press);}

.spx-btn--secondary{background:var(--surface-card);color:var(--text-strong);border-color:var(--border-default);box-shadow:var(--shadow-xs);}
.spx-btn--secondary:hover{background:var(--surface-sunken);border-color:var(--border-strong);}

.spx-btn--ghost{background:transparent;color:var(--text-brand);}
.spx-btn--ghost:hover{background:var(--surface-brand-sub);}

.spx-btn--accent{background:var(--action-accent);color:#fff;}
.spx-btn--accent:hover{background:var(--action-accent-hover);}

.spx-btn--danger{background:var(--negative-500);color:#fff;}
.spx-btn--danger:hover{background:var(--negative-600);}

.spx-btn--quiet{background:var(--surface-sunken);color:var(--text-body);}
.spx-btn--quiet:hover{background:var(--surface-inset);}

.spx-btn svg{width:1.15em;height:1.15em;}
`;

if (typeof document !== 'undefined' && !document.getElementById('spx-btn-css')) {
  const el = document.createElement('style');
  el.id = 'spx-btn-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  leadingIcon = null,
  trailingIcon = null,
  fullWidth = false,
  disabled = false,
  as = 'button',
  className = '',
  ...rest
}) {
  const Tag = as;
  const cls = [
    'spx-btn',
    `spx-btn--${variant}`,
    `spx-btn--${size}`,
    fullWidth ? 'spx-btn--full' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <Tag className={cls} disabled={Tag === 'button' ? disabled : undefined}
         aria-disabled={disabled || undefined} {...rest}>
      {leadingIcon}
      {children != null && <span>{children}</span>}
      {trailingIcon}
    </Tag>
  );
}
