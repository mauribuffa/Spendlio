import { z } from 'zod';
import { baseEntity } from './common';
import { CategoryKey, CategoryKind } from './enums';

export const CategorySchema = z.object({
  ...baseEntity,
  userId: z.string().uuid().nullable(), // null = built-in default category (shared by all users)
  key: CategoryKey,
  label: z.string().min(1),
  kind: CategoryKind,
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
});
export type Category = z.infer<typeof CategorySchema>;

export const CreateCategoryInput = CategorySchema.omit({
  id: true, userId: true, createdAt: true, updatedAt: true,
});
export type CreateCategoryInput = z.infer<typeof CreateCategoryInput>;

export const UpdateCategoryInput = CreateCategoryInput.partial();
export type UpdateCategoryInput = z.infer<typeof UpdateCategoryInput>;
