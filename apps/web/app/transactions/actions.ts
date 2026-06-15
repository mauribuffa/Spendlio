'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { CreateTransactionInput, toMinorUnits } from '@spendlio/contracts';
import { createTransaction, deleteTransaction } from '../../lib/resources';
import { ApiError } from '../../lib/api';

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** Field-level issues from a 400, keyed by field name. */
  fieldErrors?: Record<string, string[]>;
}

// The form sends strings; coerce to the contract shape (amount in cents) here,
// then validate with the same Zod schema the API enforces at its edge.
const FormSchema = z.object({
  title: z.string().min(1, 'Add a title.'),
  // Major units typed by a human ("6.75") → integer cents. The form posts the
  // sign separately so expenses store as negative.
  amountMajor: z.coerce.number().finite(),
  direction: z.enum(['expense', 'income']),
  currency: z.string().length(3),
  category: CreateTransactionInput.shape.category,
  merchant: z.string().optional(),
  occurredAt: z.string().min(1, 'Pick a date.'),
});

export async function createTransactionAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = FormSchema.safeParse({
    title: formData.get('title'),
    amountMajor: formData.get('amountMajor'),
    direction: formData.get('direction'),
    currency: formData.get('currency'),
    category: formData.get('category') || undefined,
    merchant: formData.get('merchant') || undefined,
    occurredAt: formData.get('occurredAt'),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { title, amountMajor, direction, currency, category, merchant, occurredAt } = parsed.data;
  // Major → integer minor units using the currency's real decimal places
  // (USD/ARS=2, JPY/CLP=0, BHD=3) — not a hardcoded ×100.
  const magnitude = toMinorUnits(Math.abs(amountMajor), currency.toUpperCase());
  const amount = direction === 'expense' ? -magnitude : magnitude;

  const input = CreateTransactionInput.safeParse({
    title,
    amount,
    currency: currency.toUpperCase(),
    category,
    merchant: merchant ?? null,
    occurredAt: new Date(occurredAt),
    status: direction === 'income' ? 'income' : 'cleared',
    source: 'manual',
  });

  if (!input.success) {
    return { ok: false, fieldErrors: input.error.flatten().fieldErrors as Record<string, string[]> };
  }

  try {
    await createTransaction(input.data);
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: 'Could not save the transaction.' };
  }

  revalidatePath('/transactions');
  revalidatePath('/');
  return { ok: true };
}

export async function deleteTransactionAction(id: string): Promise<ActionResult> {
  try {
    await deleteTransaction(id);
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: 'Could not delete the transaction.' };
  }
  revalidatePath('/transactions');
  revalidatePath('/');
  return { ok: true };
}
