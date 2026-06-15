import * as React from 'react';

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  title: React.ReactNode;
  message?: React.ReactNode;
  tone?: 'success' | 'error' | 'info';
  /** Optional inline action (e.g. "Undo"). */
  actionLabel?: React.ReactNode;
  onAction?: React.MouseEventHandler;
}

/** Quiet confirmation toast on the dark green surface. Requires lucide.createIcons(). */
export function Toast(props: ToastProps): JSX.Element;
