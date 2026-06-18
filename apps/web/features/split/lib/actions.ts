'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { CreateSettlementInput, CreateGroupInput, SettlementDirection, toMinorUnits } from '@spendlio/contracts';
import { createSettlement, createGroup, remindPerson } from '@/lib/resources';
import { ApiError } from '@/lib/api';

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

// Model B (ADR-028): a settlement is between you and ONE friend, with a
// direction. The form posts strings; coerce the amount (major units typed by a
// human) to integer cents, then validate with the same contract the API enforces.
const FormSchema = z.object({
  personId: z.string().uuid('Pick a person.'),
  direction: SettlementDirection,
  amountMajor: z.coerce.number().positive('Enter an amount greater than zero.'),
  currency: z.string().length(3),
});

export async function settleUpAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = FormSchema.safeParse({
    personId: formData.get('personId'),
    direction: formData.get('direction'),
    amountMajor: formData.get('amountMajor'),
    currency: formData.get('currency'),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { personId, direction, amountMajor, currency } = parsed.data;
  const amount = toMinorUnits(amountMajor, currency.toUpperCase()); // per-currency minor units

  const input = CreateSettlementInput.safeParse({
    personId,
    direction,
    amount,
    currency: currency.toUpperCase(),
  });
  if (!input.success) {
    return { ok: false, fieldErrors: input.error.flatten().fieldErrors as Record<string, string[]> };
  }

  try {
    await createSettlement(input.data);
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: 'Could not record the payment.' };
  }

  revalidatePath('/split');
  revalidatePath('/');
  return { ok: true };
}

// Create a group from a name + a set of the user's people (checkbox values).
const GroupFormSchema = z.object({
  name: z.string().min(1, 'Name the group.'),
  memberIds: z.array(z.string().uuid()).default([]),
});

export async function createGroupAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = GroupFormSchema.safeParse({
    name: formData.get('name'),
    memberIds: formData.getAll('memberIds'),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const input = CreateGroupInput.safeParse(parsed.data);
  if (!input.success) {
    return { ok: false, fieldErrors: input.error.flatten().fieldErrors as Record<string, string[]> };
  }

  try {
    await createGroup(input.data);
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: 'Could not create the group.' };
  }

  revalidatePath('/split');
  return { ok: true };
}

// Nudge one person to settle up. Bound per-row, so it takes the id directly.
export async function remindPersonAction(personId: string): Promise<ActionResult> {
  try {
    await remindPerson(personId);
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: 'Could not send the reminder.' };
  }
  return { ok: true };
}
