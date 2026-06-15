import * as React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLSpanElement> {
  width?: number | string;
  height?: number | string;
  /** Circular (avatar) placeholder — width is used as the diameter. */
  circle?: boolean;
  /** Text-line placeholder (rounded, em-height). */
  text?: boolean;
}

/** Shimmer loading placeholder. Prefer skeletons over spinners. */
export function Skeleton(props: SkeletonProps): JSX.Element;
/** Pre-composed transaction-row skeleton (avatar + two lines + amount). */
export function SkeletonRow(props: { className?: string }): JSX.Element;
