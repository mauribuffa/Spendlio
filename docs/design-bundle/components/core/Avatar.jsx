import React from 'react';

const CSS = `
.spx-avatar{
  display:inline-flex;align-items:center;justify-content:center;flex:none;
  border-radius:var(--radius-round);font-family:var(--font-sans);
  font-weight:var(--weight-semibold);color:#fff;overflow:hidden;
  background:var(--green-600);user-select:none;
  box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06);
}
.spx-avatar img{width:100%;height:100%;object-fit:cover;}
.spx-avatar--xs{width:24px;height:24px;font-size:10px;}
.spx-avatar--sm{width:32px;height:32px;font-size:12px;}
.spx-avatar--md{width:40px;height:40px;font-size:15px;}
.spx-avatar--lg{width:56px;height:56px;font-size:20px;}
.spx-avatar--xl{width:72px;height:72px;font-size:26px;}
.spx-avatar-group{display:inline-flex;}
.spx-avatar-group .spx-avatar{box-shadow:0 0 0 2px var(--surface-card);margin-left:-10px;}
.spx-avatar-group .spx-avatar:first-child{margin-left:0;}
.spx-avatar--more{background:var(--surface-inset);color:var(--text-muted);}
`;

if (typeof document !== 'undefined' && !document.getElementById('spx-avatar-css')) {
  const el = document.createElement('style');
  el.id = 'spx-avatar-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const PALETTE = ['#1B6E4F', '#BE8A30', '#3A6BAB', '#C24A3E', '#7C5CBF', '#2E9D9A', '#D2864B', '#8B8576'];

function colorFor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
function initials(name = '') {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

export function Avatar({ name = '', src = null, size = 'md', color = null, className = '', ...rest }) {
  const cls = ['spx-avatar', `spx-avatar--${size}`, className].filter(Boolean).join(' ');
  return (
    <span className={cls} style={{ background: src ? undefined : (color || colorFor(name)) }}
          title={name || undefined} {...rest}>
      {src ? <img src={src} alt={name} /> : initials(name)}
    </span>
  );
}

export function AvatarGroup({ people = [], max = 4, size = 'md' }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <span className="spx-avatar-group">
      {shown.map((p, i) => <Avatar key={i} name={p.name} src={p.src} size={size} />)}
      {extra > 0 && <span className={`spx-avatar spx-avatar--${size} spx-avatar--more`}>+{extra}</span>}
    </span>
  );
}
