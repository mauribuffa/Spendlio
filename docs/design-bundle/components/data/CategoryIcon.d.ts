import * as React from 'react';

export type CategoryKey =
  | 'groceries' | 'dining' | 'transport' | 'housing' | 'utilities' | 'shopping'
  | 'health' | 'entertainment' | 'travel' | 'subscriptions' | 'income' | 'transfer';

export interface CategoryIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Spend category key. */
  category: CategoryKey;
  size?: 'sm' | 'md' | 'lg';
  /** Rounded-square instead of circle. */
  square?: boolean;
}

/** Map of category key → { icon, color, label }. */
export const CATEGORIES: Record<CategoryKey, { icon: string; color: string; label: string }>;

/**
 * Category glyph in a tinted circle — Lucide icon + categorical color.
 * Requires lucide.createIcons() after mount to upgrade the <i data-lucide>.
 */
export function CategoryIcon(props: CategoryIconProps): JSX.Element;
