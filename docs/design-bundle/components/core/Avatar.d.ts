import * as React from 'react';

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Person's name — used for initials and a deterministic tint when no src. */
  name?: string;
  /** Photo URL. Falls back to tinted initials. */
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Force a specific background color (else derived from name). */
  color?: string | null;
}

export interface AvatarGroupProps {
  people: { name: string; src?: string | null }[];
  /** Max avatars before a "+N" chip. */
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

/** Circular user avatar — photo, or tinted initials from the categorical palette. */
export function Avatar(props: AvatarProps): JSX.Element;
/** Overlapping stack of avatars for a split group, with a "+N" overflow chip. */
export function AvatarGroup(props: AvatarGroupProps): JSX.Element;
