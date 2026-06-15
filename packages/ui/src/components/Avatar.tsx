import type { HTMLAttributes } from 'react';
import { cn } from '../cn';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  /** Full name — used for the fallback initials and the accessible label. */
  name: string;
  /** Optional image URL. Falls back to initials when absent. */
  src?: string;
  size?: AvatarSize;
  /** Override the auto-assigned tint. */
  color?: string;
}

const sizePx: Record<AvatarSize, number> = { xs: 24, sm: 32, md: 40, lg: 56, xl: 72 };
const fontPx: Record<AvatarSize, number> = { xs: 10, sm: 12, md: 15, lg: 20, xl: 26 };

// The categorical ramp, as concrete hex so avatars read consistently anywhere.
const PALETTE = ['#1B6E4F', '#BE8A30', '#3A6BAB', '#C24A3E', '#7C5CBF', '#2E9D9A', '#D2864B', '#8B8576'];

/** First letter of the first two words, e.g. "Ana Ruiz" -> "AR". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

/** Map a name to a stable ramp color so a given person is always the same hue. */
function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}

/**
 * Round person avatar. Shows an image when given, otherwise tinted initials.
 */
export function Avatar({ name, src, size = 'md', color, className, style, ...rest }: AvatarProps) {
  const px = sizePx[size];
  return (
    <span
      className={cn('spl-avatar', className)}
      role="img"
      aria-label={name}
      title={name || undefined}
      style={{
        width: px,
        height: px,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flex: 'none',
        fontFamily: 'var(--font-sans)',
        fontWeight: 'var(--weight-semibold)',
        fontSize: fontPx[size],
        color: '#fff',
        background: src ? undefined : (color ?? colorFor(name)),
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
        userSelect: 'none',
        ...style,
      }}
      {...rest}
    >
      {src ? (
        <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export interface AvatarGroupProps {
  people: { name: string; src?: string }[];
  max?: number;
  size?: AvatarSize;
}

/** Overlapping stack of avatars with a "+N" overflow chip. */
export function AvatarGroup({ people, max = 4, size = 'md' }: AvatarGroupProps) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  const px = sizePx[size];
  return (
    <span style={{ display: 'inline-flex' }}>
      {shown.map((p, i) => (
        <span
          key={i}
          style={{ marginLeft: i === 0 ? 0 : -10, borderRadius: '50%', boxShadow: '0 0 0 2px var(--surface-card)' }}
        >
          <Avatar name={p.name} src={p.src} size={size} />
        </span>
      ))}
      {extra > 0 && (
        <span
          aria-hidden
          style={{
            marginLeft: -10,
            width: px,
            height: px,
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-sans)',
            fontWeight: 'var(--weight-semibold)',
            fontSize: fontPx[size],
            background: 'var(--surface-inset)',
            color: 'var(--text-muted)',
            boxShadow: '0 0 0 2px var(--surface-card)',
          }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}
