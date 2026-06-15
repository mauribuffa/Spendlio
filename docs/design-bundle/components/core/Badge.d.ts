import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Color tone. */
  tone?: 'neutral' | 'brand' | 'positive' | 'negative' | 'warning' | 'info' | 'solid' | 'outline';
  size?: 'sm' | 'md';
  /** Show a leading status dot in the current color. */
  dot?: boolean;
  /** Optional leading icon. */
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

/** Small status / label pill — settlement state, category, counts. */
export function Badge(props: BadgeProps): JSX.Element;
