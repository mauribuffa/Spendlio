import { forwardRef, useId } from 'react';
import type { ReactNode, SelectHTMLAttributes } from 'react';
import { cn } from '../cn';

export interface SelectOption {
  value: string;
  label?: ReactNode;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  /** Options as {value,label} or plain strings. */
  options: (SelectOption | string)[];
  placeholder?: string | null;
}

/** Styled native dropdown — category, account, currency, group pickers. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label = null, options, placeholder = null, className, id, ...rest },
  ref,
) {
  // Associate the label with the control. Honor a caller-supplied id, else
  // generate a stable one (useId) so the <label htmlFor> actually targets it.
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div className={cn('spl-select', className)}>
      {label && (
        <label className="spl-select__label" htmlFor={selectId}>
          {label}
        </label>
      )}
      <div className="spl-select__box">
        <select id={selectId} ref={ref} {...rest}>
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => {
            const opt = typeof o === 'string' ? { value: o, label: o } : o;
            return (
              <option key={opt.value} value={opt.value}>
                {opt.label ?? opt.value}
              </option>
            );
          })}
        </select>
        <span className="spl-select__chevron" aria-hidden>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </div>
    </div>
  );
});
