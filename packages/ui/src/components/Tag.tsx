import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { cn } from '../cn';

export interface TagProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  /** Selected (pressed) state — used with selectable filter chips. */
  selected?: boolean;
  /** Marks the chip as a toggle (renders aria-pressed). */
  selectable?: boolean;
  /** A leading category color dot. */
  color?: string | null;
  /** Optional leading icon. */
  icon?: ReactNode;
  /** When provided, renders a trailing × that calls this. */
  onRemove?: ((e: MouseEvent) => void) | null;
  children?: ReactNode;
}

/** Filter / category chip — selectable, removable, or static. */
export const Tag = forwardRef<HTMLButtonElement, TagProps>(function Tag(
  { children, selected = false, selectable = false, color = null, icon = null, onRemove = null, className, type, ...rest },
  ref,
) {
  const isStatic = !selectable && !onRemove;
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      data-static={isStatic}
      aria-pressed={selectable ? selected : undefined}
      className={cn('spl-tag', className)}
      {...rest}
    >
      {color && <span className="spl-tag__dot" style={{ background: color }} />}
      {icon}
      {children}
      {onRemove && (
        <span
          className="spl-tag__x"
          role="button"
          aria-label="Remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(e);
          }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </span>
      )}
    </button>
  );
});
