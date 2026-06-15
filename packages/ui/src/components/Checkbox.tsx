import { forwardRef } from 'react';
import type { ChangeEventHandler, InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  label?: ReactNode;
  /** Render as a circle (e.g. selecting people in a split). */
  round?: boolean;
}

/** Checkbox — multi-select rows, "who's in this split", terms. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { checked, onChange, label = null, round = false, disabled = false, className, ...rest },
  ref,
) {
  return (
    <label className={cn('spl-check', round && 'spl-check--round', disabled && 'spl-check--disabled', className)}>
      <input ref={ref} type="checkbox" checked={checked} onChange={onChange} disabled={disabled} {...rest} />
      <span className="spl-check__box">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      {label && <span>{label}</span>}
    </label>
  );
});
