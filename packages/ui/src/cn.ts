/**
 * Tiny className joiner. Avoids a clsx dependency for the small set of
 * conditional-class needs in this package. Falsy entries are dropped.
 */
export type ClassValue = string | number | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
