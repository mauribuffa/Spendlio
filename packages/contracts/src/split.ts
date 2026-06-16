import { z } from 'zod';
import { baseEntity, ownedEntity } from './common';
import { CurrencyCode } from './money';
import { SplitMode, SettlementStatus } from './enums';

// A person you split with (friend / roommate). Owned by the user who added them.
export const PersonSchema = z.object({
  ...ownedEntity,
  name: z.string().min(1),
  email: z.string().email().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});
export type Person = z.infer<typeof PersonSchema>;

export const CreatePersonInput = PersonSchema.omit({
  id: true, userId: true, createdAt: true, updatedAt: true,
});
export type CreatePersonInput = z.infer<typeof CreatePersonInput>;

// A named group of people (Roommates, Trip to Lisbon).
export const GroupSchema = z.object({
  ...ownedEntity,
  name: z.string().min(1),
  memberIds: z.array(z.string().uuid()).default([]), // person ids
});
export type Group = z.infer<typeof GroupSchema>;

export const CreateGroupInput = GroupSchema.omit({
  id: true, userId: true, createdAt: true, updatedAt: true,
});
export type CreateGroupInput = z.infer<typeof CreateGroupInput>;

// One person's share of a split, in integer minor units.
export const SplitShareSchema = z.object({
  ...baseEntity,
  splitId: z.string().uuid(),
  personId: z.string().uuid(),
  amount: z.number().int(), // minor units owed by this person
});
export type SplitShare = z.infer<typeof SplitShareSchema>;

// A split of one expense across people. Shares are computed in core per `mode`.
export const SplitSchema = z.object({
  ...ownedEntity,
  transactionId: z.string().uuid().nullable().optional(),
  groupId: z.string().uuid().nullable().optional(),
  mode: SplitMode,
  total: z.number().int(), // minor units
  currency: CurrencyCode,
  payerId: z.string().uuid(),               // person who paid
  shares: z.array(SplitShareSchema).default([]),
});
export type Split = z.infer<typeof SplitSchema>;

// Client sends the inputs; core computes the per-person shares (deterministic
// leftover cents). The payer is always the user (resolved server-side to their
// self-person, model B — ADR-028), so the client never sends `payerId`.
// `total` is the FULL expense; the self share is whatever the participants don't cover.
export const CreateSplitInput = z
  .object({
    transactionId: z.string().uuid().nullable().optional(),
    groupId: z.string().uuid().nullable().optional(),
    mode: SplitMode,
    total: z.number().int(),
    currency: CurrencyCode,
    participantIds: z.array(z.string().uuid()).min(1), // friends the expense is split among (excludes you)
    // For 'exact'/'percent': the per-person input keyed by personId (cents or percent).
    weights: z.record(z.string().uuid(), z.number()).optional(),
  })
  .superRefine((dto, ctx) => {
    if (dto.mode === 'even') return; // even needs no weights
    const weights = dto.weights ?? {};
    const participants = new Set(dto.participantIds);
    let sum = 0;
    for (const [id, w] of Object.entries(weights)) {
      if (!participants.has(id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['weights', id], message: 'weight for a non-participant' });
      }
      if (w < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['weights', id], message: 'weight must be >= 0' });
      }
      if (dto.mode === 'exact' && !Number.isInteger(w)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['weights', id], message: 'exact weights are integer minor units' });
      }
      sum += w;
    }
    if (dto.mode === 'exact' && sum > dto.total) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['weights'], message: 'exact weights exceed the total' });
    }
    if (dto.mode === 'percent' && sum > 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['weights'], message: 'percent weights exceed 100' });
    }
  });
export type CreateSplitInput = z.infer<typeof CreateSplitInput>;

// A "who pays whom" transfer to clear a balance.
export const SettlementSchema = z.object({
  ...ownedEntity,
  fromPersonId: z.string().uuid(),
  toPersonId: z.string().uuid(),
  amount: z.number().int(), // minor units
  currency: CurrencyCode,
  status: SettlementStatus,
  settledAt: z.coerce.date().nullable().optional(),
});
export type Settlement = z.infer<typeof SettlementSchema>;

export const CreateSettlementInput = SettlementSchema.omit({
  id: true, userId: true, createdAt: true, updatedAt: true, status: true, settledAt: true,
});
export type CreateSettlementInput = z.infer<typeof CreateSettlementInput>;

// Computed (not stored) — net balance with one person, per currency (balances aren't summed across currencies).
export const Balance = z.object({
  personId: z.string().uuid(),
  currency: CurrencyCode,
  amount: z.number().int(), // + they owe you, - you owe them
});
export type Balance = z.infer<typeof Balance>;
