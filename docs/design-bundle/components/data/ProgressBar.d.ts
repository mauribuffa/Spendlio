import * as React from 'react';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  /** Label above the track. */
  label?: React.ReactNode;
  /** Right-aligned value text above the track (e.g. "$420 / $500"). */
  valueLabel?: React.ReactNode;
  /** Override the fill color (else brand green; rose when over budget). */
  color?: string | null;
  size?: 'md' | 'lg';
  /** Turn the fill rose when value exceeds max. */
  showOver?: boolean;
}

/** Budget / goal progress bar — green fill, turns rose when over budget. */
export function ProgressBar(props: ProgressBarProps): JSX.Element;
