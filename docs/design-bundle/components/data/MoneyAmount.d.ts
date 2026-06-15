import * as React from 'react';

export interface MoneyAmountProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Numeric value. Negative renders a minus + rose tone in auto mode. */
  value: number;
  currency?: string;
  decimals?: number;
  /** Show a leading + for positive values. */
  signed?: boolean;
  /** Color tone. 'auto' derives from sign. */
  tone?: 'auto' | 'positive' | 'negative' | 'neutral' | 'muted';
  /** Use the display (Space Grotesk) family for big figures. */
  display?: boolean;
  /** Font size (px or CSS length). */
  size?: number | string | null;
  weight?: number;
}

/** Formatted monetary figure — tabular numerals, sign, semantic color. */
export function MoneyAmount(props: MoneyAmountProps): JSX.Element;
