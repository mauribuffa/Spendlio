import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../cn';

export type IconButtonVariant = 'ghost' | 'solid' | 'brand';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon element (e.g. a lucide-react icon). */
  icon: ReactNode;
  /** Accessible label — required (rendered as aria-label + title). */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

/** Circular icon-only button for toolbars, headers and row affordances. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = 'ghost', size = 'md', className, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      aria-label={label}
      title={label}
      data-variant={variant}
      data-size={size}
      className={cn('spl-iconbtn', className)}
      {...rest}
    >
      {icon}
    </button>
  );
});
