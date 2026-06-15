import React from 'react';

const CSS = `
@keyframes spx-shimmer{100%{background-position:-200% 0;}}
.spx-skel{
  display:block;border-radius:var(--radius-sm);
  background:linear-gradient(90deg,var(--surface-inset) 0%,var(--surface-sunken) 40%,var(--surface-inset) 80%);
  background-size:200% 100%;animation:spx-shimmer 1.4s var(--ease-inout) infinite;
}
@media (prefers-reduced-motion: reduce){.spx-skel{animation:none;}}
.spx-skel--text{height:0.8em;border-radius:var(--radius-xs);}
.spx-skel--circle{border-radius:50%;}
.spx-skel-row{display:flex;align-items:center;gap:13px;padding:12px 4px;}
.spx-skel-row__body{flex:1;display:flex;flex-direction:column;gap:7px;}
`;

if (typeof document !== 'undefined' && !document.getElementById('spx-skel-css')) {
  const el = document.createElement('style');
  el.id = 'spx-skel-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function Skeleton({ width = '100%', height = 16, circle = false, text = false, className = '', style = {}, ...rest }) {
  const cls = ['spx-skel', circle ? 'spx-skel--circle' : '', text ? 'spx-skel--text' : '', className]
    .filter(Boolean).join(' ');
  return <span className={cls} style={{ width, height: circle ? width : height, ...style }} {...rest} />;
}

export function SkeletonRow({ className = '' }) {
  return (
    <div className={['spx-skel-row', className].filter(Boolean).join(' ')}>
      <Skeleton circle width={40} />
      <div className="spx-skel-row__body">
        <Skeleton width="55%" height={13} />
        <Skeleton width="35%" height={11} />
      </div>
      <Skeleton width={56} height={15} />
    </div>
  );
}
