import * as React from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  label?: React.ReactNode;
  /** Render as a circle (e.g. selecting people in a split). */
  round?: boolean;
  disabled?: boolean;
}

/** Checkbox — multi-select rows, "who's in this split", terms. */
export function Checkbox(props: CheckboxProps): JSX.Element;
