import type { HTMLAttributes } from 'react';
import { getCurrencyDecimals } from '@spendlio/contracts';
import { cn } from '../cn';

export interface MoneyAmountProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Integer minor units (cents). Negative = expense / you owe. */
  amount: number;
  /** ISO 4217 currency code, e.g. "USD". */
  currency: string;
  /** BCP-47 locale used for formatting. */
  locale?: string;
  /**
   * Color reinforcement. 'auto' (default) colors by sign; 'always' forces it
   * even for zero; 'off' keeps ink. Color is reinforcement only — the sign is
   * always shown and carries the meaning.
   */
  color?: 'auto' | 'always' | 'off';
  /** Visual size. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeStyle: Record<NonNullable<MoneyAmountProps['size']>, { fontSize: string; weight: string }> = {
  sm: { fontSize: 'var(--text-sm)', weight: 'var(--weight-medium)' },
  md: { fontSize: 'var(--text-base)', weight: 'var(--weight-semibold)' },
  lg: { fontSize: 'var(--text-xl)', weight: 'var(--weight-semibold)' },
  xl: { fontSize: 'var(--text-3xl)', weight: 'var(--weight-bold)' },
};

/**
 * Format minor units (cents) as a signed, currency-formatted string.
 * Always emits an explicit sign ("+"/"-"); the magnitude is formatted via
 * Intl.NumberFormat at this edge. Zero is unsigned.
 */
export function formatSignedMoney(amount: number, currency: string, locale = 'en-US'): string {
  const decimals = getCurrencyDecimals(currency);
  const major = Math.abs(amount) / 10 ** decimals;
  const body = new Intl.NumberFormat(locale, { style: 'currency', currency }).format(major);
  if (amount > 0) return `+${body}`;
  if (amount < 0) return `-${body}`;
  return body;
}

/**
 * Money display. Tabular lining numerals via [data-money]; sign always shown;
 * positive/negative color is reinforcement, not the only signal.
 */
export function MoneyAmount({
  amount,
  currency,
  locale = 'en-US',
  color = 'auto',
  size = 'md',
  className,
  style,
  ...rest
}: MoneyAmountProps) {
  const text = formatSignedMoney(amount, currency, locale);

  let semantic = 'var(--text-strong)';
  if (color !== 'off') {
    if (amount > 0) semantic = 'var(--positive-500)';
    else if (amount < 0) semantic = 'var(--negative-500)';
    else if (color === 'always') semantic = 'var(--text-muted)';
  }

  const tone = amount > 0 ? 'positive' : amount < 0 ? 'negative' : 'zero';

  return (
    <span
      data-money=""
      data-tone={tone}
      className={cn('spl-money', className)}
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: sizeStyle[size].fontSize,
        fontWeight: sizeStyle[size].weight,
        color: semantic,
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {text}
    </span>
  );
}
