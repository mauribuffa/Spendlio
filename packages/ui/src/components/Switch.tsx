import { forwardRef } from 'react';
import type { ChangeEventHandler, InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../cn';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  /** Optional trailing label. */
  label?: ReactNode;
}

/** On/off toggle — settings, "split evenly", recurring, notifications. */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { checked, onChange, label = null, disabled = false, className, ...rest },
  ref,
) {
  return (
    <label className={cn('spl-switch', disabled && 'spl-switch--disabled', className)}>
      <input ref={ref} type="checkbox" role="switch" checked={checked} onChange={onChange} disabled={disabled} {...rest} />
      <span className="spl-switch__track">
        <span className="spl-switch__thumb" />
      </span>
      {label && <span>{label}</span>}
    </label>
  );
});
