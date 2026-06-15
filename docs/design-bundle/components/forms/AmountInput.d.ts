import * as React from 'react';

export interface AmountInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  value?: string | number;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  /** Currency symbol shown before the figure. */
  currency?: string;
  /** 'hero' = big centered entry (Add expense); 'compact' = inline field. */
  size?: 'hero' | 'compact';
}

/** Money entry field with currency prefix and tabular figures. */
export function AmountInput(props: AmountInputProps): JSX.Element;
