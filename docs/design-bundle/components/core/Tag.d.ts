import * as React from 'react';

export interface TagProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Selected (pressed) state — used with selectable filter chips. */
  selected?: boolean;
  /** Marks the chip as a toggle (renders aria-pressed). */
  selectable?: boolean;
  /** A leading category color dot. */
  color?: string | null;
  /** Optional leading icon. */
  icon?: React.ReactNode;
  /** When provided, renders a trailing × that calls this. */
  onRemove?: ((e: React.MouseEvent) => void) | null;
  children?: React.ReactNode;
}

/** Filter / category chip — selectable, removable, or static. */
export function Tag(props: TagProps): JSX.Element;
