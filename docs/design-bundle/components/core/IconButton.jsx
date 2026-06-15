import React from 'react';

const CSS = `
.spx-iconbtn{
  display:inline-flex;align-items:center;justify-content:center;
  border-radius:var(--radius-pill);border:1px solid transparent;cursor:pointer;
  color:var(--text-muted);transition:var(--transition-control);flex:none;
}
.spx-iconbtn:focus-visible{outline:none;box-shadow:var(--focus-ring);}
.spx-iconbtn:active{transform:scale(var(--press-scale));}
.spx-iconbtn[disabled]{opacity:.45;pointer-events:none;}
.spx-iconbtn--sm{width:32px;height:32px;}
.spx-iconbtn--md{width:40px;height:40px;}
.spx-iconbtn--lg{width:48px;height:48px;}
.spx-iconbtn--ghost:hover{background:var(--surface-sunken);color:var(--text-strong);}
.spx-iconbtn--solid{background:var(--surface-card);border-color:var(--border-subtle);box-shadow:var(--shadow-xs);}
.spx-iconbtn--solid:hover{background:var(--surface-sunken);color:var(--text-strong);}
.spx-iconbtn--brand{background:var(--action-primary);color:#fff;}
.spx-iconbtn--brand:hover{background:var(--action-primary-hover);}
.spx-iconbtn svg{width:1.2em;height:1.2em;}
.spx-iconbtn--sm svg{font-size:16px;}.spx-iconbtn--md svg{font-size:19px;}.spx-iconbtn--lg svg{font-size:22px;}
`;

if (typeof document !== 'undefined' && !document.getElementById('spx-iconbtn-css')) {
  const el = document.createElement('style');
  el.id = 'spx-iconbtn-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  className = '',
  ...rest
}) {
  const cls = ['spx-iconbtn', `spx-iconbtn--${variant}`, `spx-iconbtn--${size}`, className]
    .filter(Boolean).join(' ');
  return (
    <button className={cls} aria-label={label} title={label} disabled={disabled} {...rest}>
      {icon}
    </button>
  );
}
