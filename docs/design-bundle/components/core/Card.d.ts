import * as React from 'react';

/**
 * The foundational surface — white, 22px radius, hairline border, soft shadow.
 * @startingPoint section="Core" subtitle="Surface card — default, brand, inverse" viewport="700x220"
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Surface style. */
  variant?: 'default' | 'flat' | 'raised' | 'inverse' | 'brand';
  /** Apply default 20px padding to the body. Set false for full-bleed content (e.g. lists). */
  padded?: boolean;
  /** Adds hover elevation + pointer affordance. */
  interactive?: boolean;
  /** Optional header title; renders a header row with a bottom divider. */
  title?: React.ReactNode;
  /** Optional element on the right of the header (e.g. an IconButton). */
  action?: React.ReactNode;
  children?: React.ReactNode;
}

/** The foundational surface — white, 22px radius, hairline border, soft shadow. */
export function Card(props: CardProps): JSX.Element;
