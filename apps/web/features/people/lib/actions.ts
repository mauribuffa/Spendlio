'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { CreatePersonInput } from '@spendlio/contracts';
import { createPerson } from '@/lib/resources';
import { ApiError } from '@/lib/api';

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** Field-level issues from a 400, keyed by field name. */
  fieldErrors?: Record<string, string[]>;
}

// The form sends strings; blank optional fields become undefined so the
// optional/nullable contract fields pass, then we validate with the same
// Zod schema the API enforces at its edge.
const FormSchema = z.object({
  name: z.string().min(1, 'Add a name.'),
  email: z.string().email('Enter a valid email.').optional(),
  avatarUrl: z.string().url('Enter a valid URL.').optional(),
});

export async function createPersonAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = FormSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email') || undefined,
    avatarUrl: formData.get('avatarUrl') || undefined,
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const input = CreatePersonInput.safeParse({
    name: parsed.data.name,
    email: parsed.data.email,
    avatarUrl: parsed.data.avatarUrl,
  });

  if (!input.success) {
    return { ok: false, fieldErrors: input.error.flatten().fieldErrors as Record<string, string[]> };
  }

  try {
    await createPerson(input.data);
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: 'Could not add this person.' };
  }

  revalidatePath('/people');
  revalidatePath('/split');
  return { ok: true };
}
