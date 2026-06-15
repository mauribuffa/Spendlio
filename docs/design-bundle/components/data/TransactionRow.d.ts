import * as React from 'react';
import type { CategoryKey } from './CategoryIcon';

export interface TransactionRowProps extends React.HTMLAttributes<HTMLElement> {
  title: React.ReactNode;
  category?: CategoryKey;
  /** Secondary line (e.g. "Split with Maya · your share"). */
  subtitle?: React.ReactNode;
  /** Merchant/account, shown before the subtitle with a dot separator. */
  merchant?: React.ReactNode;
  amount?: number;
  /** Show + for positive amounts (income). */
  signed?: boolean;
  /** Small text under the amount (e.g. a date or "you owe"). */
  meta?: React.ReactNode;
  /** Override the right column (e.g. a Badge instead of an amount). */
  rightSlot?: React.ReactNode;
  /** Override the leading element (e.g. an Avatar instead of CategoryIcon). */
  leftSlot?: React.ReactNode;
  onClick?: React.MouseEventHandler;
}

/** A single transaction / activity row — the backbone of every list in the app. */
export function TransactionRow(props: TransactionRowProps): JSX.Element;
