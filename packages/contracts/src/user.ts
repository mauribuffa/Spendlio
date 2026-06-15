import { z } from 'zod';
import { baseEntity } from './common';
import { CurrencyCode } from './money';

export const UserSchema = z.object({
  ...baseEntity,
  email: z.string().email(),
  name: z.string().min(1),
  // ADR-017: locale/timezone are stored separately from defaultCurrency (locale != currency).
  defaultCurrency: CurrencyCode, // base currency for converted views & FX snapshots (ADR-016)
  locale: z.string().default('en-US'),
  timezone: z.string().default('UTC'),
});
export type User = z.infer<typeof UserSchema>;

export const CreateUserInput = UserSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type CreateUserInput = z.infer<typeof CreateUserInput>;

// Settings (Slice F): only name + defaultCurrency are user-editable.
// (email/locale/timezone are managed elsewhere; not exposed to PATCH /me.)
export const UpdateUserInput = UserSchema.pick({ name: true, defaultCurrency: true }).partial();
export type UpdateUserInput = z.infer<typeof UpdateUserInput>;
