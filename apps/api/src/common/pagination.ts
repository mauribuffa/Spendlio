export interface Cursor { occurredAt: string; id: string }
export const encodeCursor = (c: Cursor) => Buffer.from(JSON.stringify(c)).toString('base64url');
export const decodeCursor = (s?: string): Cursor | null =>
  s ? JSON.parse(Buffer.from(s, 'base64url').toString()) : null;
