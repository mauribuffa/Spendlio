import React from 'react';

const CSS = `
.spx-badge{
  display:inline-flex;align-items:center;gap:5px;font-family:var(--font-sans);
  font-weight:var(--weight-semibold);font-size:12px;line-height:1;
  padding:4px 9px;border-radius:var(--radius-pill);white-space:nowrap;
  border:1px solid transparent;
}
.spx-badge--sm{font-size:11px;padding:3px 7px;}
.spx-badge svg{width:13px;height:13px;}
.spx-badge--dot::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;}
.spx-badge--neutral{background:var(--surface-sunken);color:var(--text-muted);}
.spx-badge--brand{background:var(--surface-brand-sub);color:var(--green-700);}
.spx-badge--positive{background:var(--positive-50);color:var(--positive-700);}
.spx-badge--negative{background:var(--negative-50);color:var(--negative-700);}
.spx-badge--warning{background:var(--warning-50);color:var(--warning-700);}
.spx-badge--info{background:var(--info-50);color:var(--info-700);}
.spx-badge--solid{background:var(--action-primary);color:#fff;}
.spx-badge--outline{background:transparent;border-color:var(--border-default);color:var(--text-muted);}
`;

if (typeof document !== 'undefined' && !document.getElementById('spx-badge-css')) {
  const el = document.createElement('style');
  el.id = 'spx-badge-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function Badge({
  children,
  tone = 'neutral',
  size = 'md',
  dot = false,
  icon = null,
  className = '',
  ...rest
}) {
  const cls = [
    'spx-badge',
    `spx-badge--${tone}`,
    size === 'sm' ? 'spx-badge--sm' : '',
    dot ? 'spx-badge--dot' : '',
    className,
  ].filter(Boolean).join(' ');
  return (
    <span className={cls} {...rest}>
      {icon}
      {children}
    </span>
  );
}
