import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, HTMLAttributes, MouseEvent, ReactNode } from 'react';
import { cn } from '../cn';

const RemoveIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

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
  const dot = color ? <span className="spl-tag__dot" style={{ background: color }} /> : null;

  // Removable token: a non-interactive container holding a REAL nested remove
  // <button>. (A role="button" span inside a <button> is invalid — interactive
  // controls cannot nest.) The chip body itself isn't a button here.
  if (onRemove) {
    return (
      <span data-static="true" className={cn('spl-tag', className)} {...(rest as HTMLAttributes<HTMLSpanElement>)}>
        {dot}
        {icon}
        {children}
        <button
          type="button"
          className="spl-tag__x"
          aria-label="Remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(e);
          }}
        >
          <RemoveIcon />
        </button>
      </span>
    );
  }

  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      data-static={!selectable}
      aria-pressed={selectable ? selected : undefined}
      className={cn('spl-tag', className)}
      {...rest}
    >
      {dot}
      {icon}
      {children}
    </button>
  );
});
