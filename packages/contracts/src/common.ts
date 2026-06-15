import { z } from 'zod';

export const baseEntity = {
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
};
export const ownedEntity = { ...baseEntity, userId: z.string().uuid() };

export const Page = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ items: z.array(item), nextCursor: z.string().nullable() });
