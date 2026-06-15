import * as React from 'react';

/**
 * KPI stat — uppercase label, big display figure, signed delta with trend arrow.
 * @startingPoint section="Data" subtitle="KPI stat with trend delta" viewport="700x180"
 */
export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  /** The headline figure (string so you control formatting, e.g. "$2,480"). */
  value: React.ReactNode;
  /** Delta text, e.g. "−12%". */
  delta?: React.ReactNode;
  /** Force the arrow/color direction; 'auto' reads the sign of delta. */
  deltaDirection?: 'auto' | 'up' | 'down' | 'flat';
  /** Trailing muted caption after the delta, e.g. "vs April". */
  deltaCaption?: React.ReactNode;
  /** Which direction is "good" (green). Spending down is good; income up is good. */
  goodWhen?: 'up' | 'down';
  valueSize?: number;
}

/** KPI stat — uppercase label, big display figure, signed delta with trend arrow. */
export function Stat(props: StatProps): JSX.Element;
