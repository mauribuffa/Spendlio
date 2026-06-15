import type { CSSProperties } from 'react';
import {
  ShoppingCart,
  UtensilsCrossed,
  CarFront,
  House,
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
 * the 8-color data-viz ramp (--cat-1..8), per the canonical design system.
 * The record is keyed by the literal union, so adding/removing a category in
 * contracts is a type error here.
 */
const CATEGORY_META: Record<CategoryKey, { icon: LucideIcon; cat: number }> = {
  groceries: { icon: ShoppingCart, cat: 1 }, // green
  dining: { icon: UtensilsCrossed, cat: 2 }, // gold
  transport: { icon: CarFront, cat: 3 }, // blue
  housing: { icon: House, cat: 4 }, // rose
  utilities: { icon: Plug, cat: 6 }, // teal
  shopping: { icon: ShoppingBag, cat: 5 }, // violet
  health: { icon: HeartPulse, cat: 4 }, // rose
  entertainment: { icon: Clapperboard, cat: 5 }, // violet
  travel: { icon: Plane, cat: 3 }, // blue
  subscriptions: { icon: Repeat, cat: 7 }, // clay
  income: { icon: ArrowDownLeft, cat: 1 }, // green
  transfer: { icon: ArrowLeftRight, cat: 8 }, // stone
};

export type CategoryIconSize = 'sm' | 'md' | 'lg';

export interface CategoryIconProps {
  category: CategoryKey;
  size?: CategoryIconSize;
  /** Render inside a tinted chip (default) or as a bare icon. */
  chip?: boolean;
  /** Rounded-square chip instead of the default circle. */
  square?: boolean;
  className?: string;
  style?: CSSProperties;
}

const sizePx: Record<CategoryIconSize, { box: number; icon: number }> = {
  sm: { box: 32, icon: 16 },
  md: { box: 40, icon: 19 },
  lg: { box: 48, icon: 22 },
};

/**
 * Category glyph. Tinted circular chip by default so a category reads at a
 * glance in a transaction row. Color comes from the --cat ramp, icon from Lucide.
 */
export function CategoryIcon({
  category,
  size = 'md',
  chip = true,
  square = false,
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
        borderRadius: square ? 'var(--radius-md)' : 'var(--radius-round)',
        background: `color-mix(in srgb, ${color} 14%, var(--surface-card))`,
        color,
        ...style,
      }}
    >
      <Icon size={icon} strokeWidth={2} aria-hidden="true" />
    </span>
  );
}
