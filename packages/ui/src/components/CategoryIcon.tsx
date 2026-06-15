import type { CSSProperties } from 'react';
import {
  ShoppingCart,
  UtensilsCrossed,
  Bus,
  Home,
  Plug,
  ShoppingBag,
  HeartPulse,
  Clapperboard,
  Plane,
  Repeat,
  ArrowDownLeft,
  ArrowLeftRight,
  type LucideIcon,
} from 'lucide-react';
import type { CategoryKey } from '@spendlio/contracts';
import { cn } from '../cn';

/**
 * Every one of the 12 CategoryKey values maps to a Lucide icon and a slot on
 * the 8-color data-viz ramp (--cat-1..8). The record is keyed by the literal
 * union, so adding/removing a category in contracts is a type error here.
 */
const CATEGORY_META: Record<CategoryKey, { icon: LucideIcon; cat: number }> = {
  groceries: { icon: ShoppingCart, cat: 1 },
  dining: { icon: UtensilsCrossed, cat: 2 },
  transport: { icon: Bus, cat: 3 },
  housing: { icon: Home, cat: 7 },
  utilities: { icon: Plug, cat: 6 },
  shopping: { icon: ShoppingBag, cat: 4 },
  health: { icon: HeartPulse, cat: 4 },
  entertainment: { icon: Clapperboard, cat: 5 },
  travel: { icon: Plane, cat: 3 },
  subscriptions: { icon: Repeat, cat: 5 },
  income: { icon: ArrowDownLeft, cat: 1 },
  transfer: { icon: ArrowLeftRight, cat: 8 },
};

export type CategoryIconSize = 'sm' | 'md' | 'lg';

export interface CategoryIconProps {
  category: CategoryKey;
  size?: CategoryIconSize;
  /** Render inside a tinted rounded chip (default) or as a bare icon. */
  chip?: boolean;
  className?: string;
  style?: CSSProperties;
}

const sizePx: Record<CategoryIconSize, { box: number; icon: number }> = {
  sm: { box: 28, icon: 15 },
  md: { box: 36, icon: 19 },
  lg: { box: 44, icon: 23 },
};

/**
 * Category glyph. Tinted chip by default so a category reads at a glance in a
 * transaction row. The color comes from the --cat ramp, the icon from Lucide.
 */
export function CategoryIcon({
  category,
  size = 'md',
  chip = true,
  className,
  style,
}: CategoryIconProps) {
  const meta = CATEGORY_META[category];
  const { box, icon } = sizePx[size];
  const color = `var(--cat-${meta.cat})`;
  const Icon = meta.icon;

  if (!chip) {
    return (
      <Icon
        size={icon}
        strokeWidth={2}
        color={color}
        aria-label={category}
        className={cn('spl-category-icon', className)}
        style={style}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={category}
      className={cn('spl-category-icon', className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: box,
        height: box,
        flexShrink: 0,
        borderRadius: 'var(--radius-md)',
        background: `color-mix(in srgb, ${color} 14%, var(--color-surface))`,
        color,
        ...style,
      }}
    >
      <Icon size={icon} strokeWidth={2} aria-hidden="true" />
    </span>
  );
}
