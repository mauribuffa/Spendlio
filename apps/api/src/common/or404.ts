import { NotFoundException } from '@nestjs/common';
/** Return the row or throw 404 — dedups the repeated not-found guard. */
export function or404<T>(row: T | undefined): T {
  if (!row) throw new NotFoundException();
  return row;
}
