import * as React from 'react';

/**
 * Primary call-to-action button. Pill-shaped, sentence-case verb labels.
 * @startingPoint section="Core" subtitle="Pill button — 6 variants × 3 sizes" viewport="700x150"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger' | 'quiet';
  /** Control height. */
  size?: 'sm' | 'md' | 'lg';
  /** Icon element rendered before the label (e.g. a Lucide <svg>). */
  leadingIcon?: React.ReactNode;
  /** Icon element rendered after the label. */
  trailingIcon?: React.ReactNode;
  /** Stretch to fill the container width. */
  fullWidth?: boolean;
  disabled?: boolean;
  /** Render as another element/component (e.g. 'a'). */
  as?: any;
  children?: React.ReactNode;
}

/** Primary call-to-action button. Pill-shaped, sentence-case verb labels. */
export function Button(props: ButtonProps): JSX.Element;
