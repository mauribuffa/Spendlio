export interface Cursor { occurredAt: string; id: string }
export const encodeCursor = (c: Cursor) => Buffer.from(JSON.stringify(c)).toString('base64url');
// A malformed/garbage cursor is treated as "no cursor" rather than crashing the
// request (a bad ?cursor= must not 500). Only well-formed cursors page.
export const decodeCursor = (s?: string): Cursor | null => {
  if (!s) return null;
  try {
    const parsed = JSON.parse(Buffer.from(s, 'base64url').toString());
    if (parsed && typeof parsed.occurredAt === 'string' && typeof parsed.id === 'string') {
      return parsed as Cursor;
    }
    return null;
  } catch {
    return null;
  }
};
