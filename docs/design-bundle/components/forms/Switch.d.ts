import * as React from 'react';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  /** Optional trailing label. */
  label?: React.ReactNode;
  disabled?: boolean;
}

/** On/off toggle — settings, "split evenly", recurring, notifications. */
export function Switch(props: SwitchProps): JSX.Element;
