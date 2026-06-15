import type { HTMLAttributes } from 'react';
import { cn } from '../cn';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  /** Full name — used for the fallback initials and the accessible label. */
  name: string;
  /** Optional image URL. Falls back to initials when absent. */
  src?: string;
  size?: AvatarSize;
}

const sizePx: Record<AvatarSize, number> = { sm: 28, md: 36, lg: 48 };

/** First letter of the first two words, e.g. "Ana Ruiz" -> "AR". */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** Map a name to a stable category-ramp color so people read consistently. */
function tintFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const idx = (Math.abs(hash) % 8) + 1;
  return `var(--cat-${idx})`;
}

/**
 * Round person avatar. Shows an image when given, otherwise tinted initials.
 */
export function Avatar({ name, src, size = 'md', className, style, ...rest }: AvatarProps) {
  const px = sizePx[size];
  const base = {
    width: px,
    height: px,
    borderRadius: 'var(--radius-pill)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  } as const;

  if (src) {
    return (
      <span className={cn('spl-avatar', className)} style={{ ...base, ...style }} {...rest}>
        <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </span>
    );
  }

  return (
    <span
      className={cn('spl-avatar', className)}
      role="img"
      aria-label={name}
      style={{
        ...base,
        background: tintFor(name),
        color: 'var(--color-on-primary)',
        fontFamily: 'var(--font-display)',
        fontWeight: 'var(--weight-semibold)',
        fontSize: px * 0.4,
        ...style,
      }}
      {...rest}
    >
      {initials(name)}
    </span>
  );
}
