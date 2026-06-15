import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../cn';

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** A lucide-react icon element (or any node). */
  icon?: ReactNode;
  title: ReactNode;
  message?: ReactNode;
  /** A primary action (e.g. a Button). */
  action?: ReactNode;
}

/** Warm, single-action empty state. */
export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  { icon = null, title, message = null, action = null, className, ...rest },
  ref,
) {
  return (
    <div ref={ref} className={cn('spl-empty', className)} {...rest}>
      {icon && <span className="spl-empty__art">{icon}</span>}
      <span className="spl-empty__title">{title}</span>
      {message && <span className="spl-empty__msg">{message}</span>}
      {action && <span className="spl-empty__action">{action}</span>}
    </div>
  );
});
