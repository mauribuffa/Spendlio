import React from 'react';

function format(value, { currency = '$', decimals = 2, signed = false } = {}) {
  const n = Math.abs(Number(value) || 0);
  const str = n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const neg = Number(value) < 0;
  const sign = neg ? '\u2212' : (signed ? '+' : '');
  return `${sign}${currency}${str}`;
}

const CSS = `
.spx-money{font-family:var(--font-sans);font-variant-numeric:tabular-nums lining-nums;font-feature-settings:"tnum" 1,"lnum" 1;white-space:nowrap;}
.spx-money--display{font-family:var(--font-display);letter-spacing:-0.015em;}
.spx-money--positive{color:var(--money-positive);}
.spx-money--negative{color:var(--money-negative);}
.spx-money--neutral{color:var(--text-strong);}
.spx-money--muted{color:var(--text-muted);}
`;

if (typeof document !== 'undefined' && !document.getElementById('spx-money-css')) {
  const el = document.createElement('style');
  el.id = 'spx-money-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function MoneyAmount({
  value,
  currency = '$',
  decimals = 2,
  signed = false,
  tone = 'auto',
  display = false,
  size = null,
  weight = 700,
  className = '',
  ...rest
}) {
  let t = tone;
  if (tone === 'auto') t = Number(value) < 0 ? 'negative' : Number(value) > 0 && signed ? 'positive' : 'neutral';
  const cls = ['spx-money', display ? 'spx-money--display' : '', `spx-money--${t}`, className]
    .filter(Boolean).join(' ');
  return (
    <span className={cls} data-money style={{ fontSize: size || undefined, fontWeight: weight }} {...rest}>
      {format(value, { currency, decimals, signed })}
    </span>
  );
}
