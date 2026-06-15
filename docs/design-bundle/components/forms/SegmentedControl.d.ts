import * as React from 'react';

export interface SegmentOption {
  value: string;
  label?: React.ReactNode;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps {
  /** Options as {value,label,icon} or plain strings. */
  options: (SegmentOption | string)[];
  value: string;
  onChange?: (value: string) => void;
  fullWidth?: boolean;
  className?: string;
}

/** Pill segmented control with a sliding thumb — view switches, split modes. */
export function SegmentedControl(props: SegmentedControlProps): JSX.Element;
