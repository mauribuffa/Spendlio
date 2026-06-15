import React from 'react';
import { CategoryIcon } from './CategoryIcon.jsx';
import { MoneyAmount } from './MoneyAmount.jsx';

const CSS = `
.spx-txn{
  display:flex;align-items:center;gap:13px;padding:12px 4px;font-family:var(--font-sans);
  width:100%;text-align:left;background:none;border:none;border-radius:var(--radius-md);
  transition:var(--transition-colors);
}
button.spx-txn{cursor:pointer;}
button.spx-txn:hover{background:var(--surface-sunken);}
.spx-txn__body{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;}
.spx-txn__title{font-size:15px;font-weight:var(--weight-semibold);color:var(--text-strong);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.spx-txn__sub{font-size:12.5px;color:var(--text-muted);display:flex;align-items:center;gap:6px;}
.spx-txn__sub .dot{width:3px;height:3px;border-radius:50%;background:var(--neutral-400);}
.spx-txn__right{display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex:none;}
.spx-txn__meta{font-size:11.5px;color:var(--text-subtle);}
`;

if (typeof document !== 'undefined' && !document.getElementById('spx-txn-css')) {
  const el = document.createElement('style');
  el.id = 'spx-txn-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function TransactionRow({
  title,
  category = 'transfer',
  subtitle = null,
  merchant = null,
  amount = 0,
  signed = false,
  meta = null,
  rightSlot = null,
  leftSlot = null,
  onClick = null,
  className = '',
  ...rest
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={['spx-txn', className].filter(Boolean).join(' ')} onClick={onClick} type={onClick ? 'button' : undefined} {...rest}>
      {leftSlot || <CategoryIcon category={category} />}
      <span className="spx-txn__body">
        <span className="spx-txn__title">{title}</span>
        {(subtitle || merchant) && (
          <span className="spx-txn__sub">
            {merchant && <span>{merchant}</span>}
            {merchant && subtitle && <span className="dot" />}
            {subtitle && <span>{subtitle}</span>}
          </span>
        )}
      </span>
      <span className="spx-txn__right">
        {rightSlot || <MoneyAmount value={amount} signed={signed} weight={700} size={15} />}
        {meta && <span className="spx-txn__meta">{meta}</span>}
      </span>
    </Tag>
  );
}
