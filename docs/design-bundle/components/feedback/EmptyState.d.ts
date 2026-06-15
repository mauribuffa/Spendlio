import * as React from 'react';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lucide icon name, or a custom node. */
  icon?: string | React.ReactNode;
  title: React.ReactNode;
  message?: React.ReactNode;
  /** A primary action (e.g. a Button). */
  action?: React.ReactNode;
}

/** Warm, single-action empty state. Requires lucide.createIcons() for string icons. */
export function EmptyState(props: EmptyStateProps): JSX.Element;
