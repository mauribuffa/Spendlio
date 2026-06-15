import React from 'react';

/** Default Spendlio spend categories → Lucide icon + categorical color. */
export const CATEGORIES = {
  groceries:     { icon: 'shopping-cart', color: '#1B6E4F', label: 'Groceries' },
  dining:        { icon: 'utensils',      color: '#BE8A30', label: 'Dining' },
  transport:     { icon: 'car-front',     color: '#3A6BAB', label: 'Transport' },
  housing:       { icon: 'house',         color: '#C24A3E', label: 'Housing' },
  utilities:     { icon: 'plug',          color: '#2E9D9A', label: 'Utilities' },
  shopping:      { icon: 'shopping-bag',  color: '#7C5CBF', label: 'Shopping' },
  health:        { icon: 'heart-pulse',   color: '#C24A3E', label: 'Health' },
  entertainment: { icon: 'clapperboard',  color: '#7C5CBF', label: 'Entertainment' },
  travel:        { icon: 'plane',         color: '#3A6BAB', label: 'Travel' },
  subscriptions: { icon: 'repeat',        color: '#D2864B', label: 'Subscriptions' },
  income:        { icon: 'arrow-down-left', color: '#1B6E4F', label: 'Income' },
  transfer:      { icon: 'arrow-left-right', color: '#8B8576', label: 'Transfer' },
};

const CSS = `
.spx-cat{display:inline-flex;align-items:center;justify-content:center;border-radius:var(--radius-round);flex:none;}
.spx-cat--sm{width:32px;height:32px;}
.spx-cat--md{width:40px;height:40px;}
.spx-cat--lg{width:48px;height:48px;}
.spx-cat--square{border-radius:var(--radius-md);}
.spx-cat--sm svg{width:16px;height:16px;}
.spx-cat--md svg{width:19px;height:19px;}
.spx-cat--lg svg{width:22px;height:22px;}
.spx-cat i{display:inline-flex;}
`;

if (typeof document !== 'undefined' && !document.getElementById('spx-cat-css')) {
  const el = document.createElement('style');
  el.id = 'spx-cat-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function CategoryIcon({ category = 'transfer', size = 'md', square = false, className = '', ...rest }) {
  const meta = CATEGORIES[category] || CATEGORIES.transfer;
  const cls = ['spx-cat', `spx-cat--${size}`, square ? 'spx-cat--square' : '', className]
    .filter(Boolean).join(' ');
  return (
    <span className={cls} title={meta.label}
      style={{ background: `color-mix(in oklab, ${meta.color} 14%, white)`, color: meta.color }} {...rest}>
      <i data-lucide={meta.icon}></i>
    </span>
  );
}
