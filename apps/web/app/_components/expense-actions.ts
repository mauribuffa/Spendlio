'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { CreateTransactionInput, CreateSplitInput } from '@spendlio/contracts';
import { createTransaction, createSplit, listPeople } from '../../lib/resources';
import { ApiError } from '../../lib/api';
import type { Person } from '../../lib/resources';

export interface ExpenseActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/** People the current user can split with (server-fetched for the modal). */
export async function loadPeople(): Promise<Person[]> {
  try {
    return await listPeople();
  } catch {
    return [];
  }
}

// One participant's owed share, in integer minor units (what they owe *you*).
const ShareSchema = z.object({ personId: z.string().uuid(), cents: z.number().int().nonnegative() });

const PayloadSchema = z.object({
  amountMajor: z.coerce.number().positive('Enter an amount greater than zero.'),
  description: z.string().min(1, 'Add a description.'),
  category: CreateTransactionInput.shape.category,
  currency: z.string().length(3).default('USD'),
  // Optional split: the people who owe you a share of this expense.
  split: z
    .object({
      mode: z.enum(['even', 'exact', 'percent']),
      shares: z.array(ShareSchema).min(1),
    })
    .nullable()
    .optional(),
});

export type ExpensePayload = z.input<typeof PayloadSchema>;

/**
 * Create an expense, and (optionally) a split recording what each selected
 * person owes you. Composes the existing /transactions and /splits endpoints —
 * no new API. Per ADR-021 the user is the implicit creditor and each share's
 * person is a debtor, so the split's `total` is the *others'* portion.
 */
export async function createExpenseAction(payload: ExpensePayload): Promise<ExpenseActionResult> {
  const parsed = PayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }
  const { amountMajor, description, category, currency, split } = parsed.data;
  const magnitude = Math.round(amountMajor * 100); // 2-dp entry currency

  const txnInput = CreateTransactionInput.safeParse({
    title: description,
    amount: -magnitude,
    currency: currency.toUpperCase(),
    category,
    occurredAt: new Date(),
    status: 'cleared',
    source: 'manual',
  });
  if (!txnInput.success) {
    return { ok: false, fieldErrors: txnInput.error.flatten().fieldErrors as Record<string, string[]> };
  }

  let txnId: string;
  try {
    const txn = await createTransaction(txnInput.data);
    txnId = txn.id;
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: 'Could not save the expense.' };
  }

  if (split && split.shares.length > 0) {
    const total = split.shares.reduce((s, x) => s + x.cents, 0);
    const participantIds = split.shares.map((s) => s.personId);
    // Even: let core divide the others' portion. Exact: send per-person weights.
    const splitInput = CreateSplitInput.safeParse({
      transactionId: txnId,
      mode: split.mode === 'even' ? 'even' : 'exact',
      total,
      currency: currency.toUpperCase(),
      payerId: participantIds[0], // ignored by model-B netting (ADR-021)
      participantIds,
      ...(split.mode === 'even'
        ? {}
        : { weights: Object.fromEntries(split.shares.map((s) => [s.personId, s.cents])) }),
    });
    if (splitInput.success) {
      try {
        await createSplit(splitInput.data);
      } catch {
        // Expense already saved; surface a soft note but don't fail the whole op.
        revalidatePath('/transactions');
        revalidatePath('/');
        revalidatePath('/split');
        return { ok: true, error: 'Expense saved, but the split could not be recorded.' };
      }
    }
  }

  revalidatePath('/transactions');
  revalidatePath('/');
  revalidatePath('/split');
  return { ok: true };
}
