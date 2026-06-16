import { forwardRef } from 'react';
import type { ChangeEventHandler, InputHTMLAttributes } from 'react';
import { cn } from '../cn';

export type AmountInputSize = 'hero' | 'compact';

export interface AmountInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  value?: string | number;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  /** Currency symbol shown before the figure. */
  currency?: string;
  /** 'hero' = big centered entry (Add expense); 'compact' = inline field. */
  size?: AmountInputSize;
}

/** Money entry field with currency prefix and tabular figures. */
export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(function AmountInput(
  { value, onChange, currency = '$', placeholder = '0.00', size = 'hero', className, ...rest },
  ref,
) {
  return (
    <div className={cn('spl-amount', size === 'compact' && 'spl-amount--compact', className)}>
      <span className="spl-amount__cur">{currency}</span>
      <input ref={ref} inputMode="decimal" value={value} onChange={onChange} placeholder={placeholder} data-money {...rest} />
    </div>
  );
});
