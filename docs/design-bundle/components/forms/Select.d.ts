import * as React from 'react';

export interface SelectOption { value: string; label?: React.ReactNode; }

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  /** Options as {value,label} or plain strings. */
  options: (SelectOption | string)[];
  value?: string;
  placeholder?: string | null;
}

/** Styled native dropdown — category, account, currency, group pickers. */
export function Select(props: SelectProps): JSX.Element;
