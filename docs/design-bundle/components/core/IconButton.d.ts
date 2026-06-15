import * as React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon element (e.g. a Lucide <svg>). */
  icon: React.ReactNode;
  /** Accessible label — required (rendered as aria-label + title). */
  label: string;
  variant?: 'ghost' | 'solid' | 'brand';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

/** Circular icon-only button for toolbars, headers and row affordances. */
export function IconButton(props: IconButtonProps): JSX.Element;
