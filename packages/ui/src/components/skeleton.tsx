import type { CSSProperties, HTMLAttributes } from 'react';
import { cn } from '../cn';

export interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  width?: number | string;
  height?: number | string;
  /** Circular (avatar) placeholder — width is used as the diameter. */
  circle?: boolean;
  /** Text-line placeholder (rounded, em-height). */
  text?: boolean;
}

/** Shimmer loading placeholder. Prefer skeletons over spinners. */
export function Skeleton({ width = '100%', height = 16, circle = false, text = false, className, style, ...rest }: SkeletonProps) {
  const merged: CSSProperties = { width, height: circle ? width : height, ...style };
  return <span className={cn('spl-skel', circle && 'spl-skel--circle', text && 'spl-skel--text', className)} style={merged} {...rest} />;
}

/** Pre-composed transaction-row skeleton (avatar + two lines + amount). */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn('spl-skel-row', className)}>
      <Skeleton circle width={40} />
      <div className="spl-skel-row__body">
        <Skeleton width="55%" height={13} />
        <Skeleton width="35%" height={11} />
      </div>
      <Skeleton width={56} height={15} />
    </div>
  );
}
