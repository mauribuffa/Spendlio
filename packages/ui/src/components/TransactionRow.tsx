import type { HTMLAttributes, ReactNode } from 'react';
import type { CategoryKey } from '@spendlio/contracts';
import { cn } from '../cn';
import { CategoryIcon } from './CategoryIcon';
import { MoneyAmount } from './MoneyAmount';

export interface TransactionRowProps extends HTMLAttributes<HTMLDivElement> {
  category: CategoryKey;
  title: string;
  /** Merchant or secondary line. Optional. */
  merchant?: string | null;
  /** Integer minor units (cents). Negative = expense. */
  amount: number;
  currency: string;
  locale?: string;
  /** Optional trailing slot under the amount (e.g. a date or status). */
  meta?: ReactNode;
}

/**
 * A single ledger line: category glyph, title + merchant, signed amount.
 * Composes CategoryIcon and MoneyAmount so a list stays visually consistent.
 */
export function TransactionRow({
  category,
  title,
  merchant,
  amount,
  currency,
  locale,
  meta,
  className,
  style,
  ...rest
}: TransactionRowProps) {
  return (
    <div
      className={cn('spl-transaction-row', className)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-1)',
        fontFamily: 'var(--font-body)',
        ...style,
      }}
      {...rest}
    >
      <CategoryIcon category={category} size="md" />

      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            color: 'var(--color-ink)',
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--weight-medium)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </div>
        {merchant ? (
          <div
            style={{
              color: 'var(--color-ink-subtle)',
              fontSize: 'var(--text-sm)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {merchant}
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
        <MoneyAmount amount={amount} currency={currency} locale={locale} size="md" />
        {meta ? (
          <span style={{ color: 'var(--color-ink-subtle)', fontSize: 'var(--text-xs)' }}>{meta}</span>
        ) : null}
      </div>
    </div>
  );
}
