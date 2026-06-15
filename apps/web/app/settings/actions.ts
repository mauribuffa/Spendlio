'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { UpdateUserInput } from '@spendlio/contracts';
import { updateMe } from '../../lib/resources';
import { ApiError } from '../../lib/api';

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** Field-level issues from a 400, keyed by field name. */
  fieldErrors?: Record<string, string[]>;
}

// The form sends strings; validate shape here, then against the contract DTO.
const FormSchema = z.object({
  name: z.string().min(1, 'Add a name.'),
  defaultCurrency: z.string().length(3, 'Pick a currency.'),
});

export async function updateMeAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = FormSchema.safeParse({
    name: formData.get('name'),
    defaultCurrency: formData.get('defaultCurrency'),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const input = UpdateUserInput.safeParse({
    name: parsed.data.name,
    defaultCurrency: parsed.data.defaultCurrency.toUpperCase(),
  });

  if (!input.success) {
    return { ok: false, fieldErrors: input.error.flatten().fieldErrors as Record<string, string[]> };
  }

  try {
    await updateMe(input.data);
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: 'Could not save your settings.' };
  }

  revalidatePath('/settings'); // re-render the profile card
  revalidatePath('/');         // base-currency change re-rolls overview totals
  return { ok: true };
}
