import 'server-only';
import { z } from 'zod';
import {
  Page,
  TransactionSchema,
  type Transaction,
  type CreateTransactionInput,
  type UpdateTransactionInput,
  BudgetSchema,
  BudgetStatus,
  type Budget,
  type CreateBudgetInput,
  CategorySchema,
  type Category,
  AccountSchema,
  type Account,
  AccountBalanceSchema,
  type AccountBalance,
  PersonSchema,
  type Person,
  type CreatePersonInput,
  GroupSchema,
  type Group,
  type CreateGroupInput,
  SplitSchema,
  type Split,
  type CreateSplitInput,
  Balance,
  type Balance as BalanceT,
  MonthlySummarySchema,
  type MonthlySummary,
  UserSchema,
  type User,
  type UpdateUserInput,
  ReceiptSchema,
  type Receipt,
  type CreateReceiptInput,
  type ConfirmReceiptInput,
  PresignedUploadSchema,
  type PresignedUpload,
  SettlementSchema,
  type Settlement,
  type CreateSettlementInput,
} from '@spendlio/contracts';
import { api } from './api';

/**
 * One typed function per API endpoint the web app consumes. Reads parse the
 * response against the contract schema, so a drift between API and contracts
 * surfaces here as a parse error rather than a silent UI bug.
 */

// ---- Transactions ----
const TransactionPage = Page(TransactionSchema);

export function listTransactions(cursor?: string): Promise<z.infer<typeof TransactionPage>> {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return api.get(`/transactions${qs}`, TransactionPage);
}

export function getTransaction(id: string): Promise<Transaction> {
  return api.get(`/transactions/${id}`, TransactionSchema);
}

export function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  return api.post(`/transactions`, input, TransactionSchema);
}

export function updateTransaction(id: string, input: UpdateTransactionInput): Promise<Transaction> {
  return api.patch(`/transactions/${id}`, input, TransactionSchema);
}

export function deleteTransaction(id: string): Promise<void> {
  return api.delete(`/transactions/${id}`);
}

/**
 * Paginated list endpoints wrap rows in `{ items, nextCursor }`. These resources
 * present the whole collection (no pager UI), so parse the envelope and return
 * `items`. Endpoints that return a bare array (budgets/status, accounts/balances,
 * groups, balances) keep using `z.array(...)` directly.
 */
function listItems<T extends z.ZodTypeAny>(path: string, item: T): Promise<z.infer<T>[]> {
  return api
    .get<{ items: z.infer<T>[] }>(path, z.object({ items: z.array(item) }))
    .then((page) => page.items);
}

// ---- Budgets ----
export function listBudgets(): Promise<Budget[]> {
  return listItems(`/budgets`, BudgetSchema);
}

export function getBudgetStatus(): Promise<BudgetStatus[]> {
  return api.get(`/budgets/status`, z.array(BudgetStatus));
}

export function createBudget(input: CreateBudgetInput): Promise<Budget> {
  return api.post(`/budgets`, input, BudgetSchema);
}

// ---- Categories ----
export function listCategories(): Promise<Category[]> {
  return listItems(`/categories`, CategorySchema);
}

// ---- Accounts ----
export function listAccounts(): Promise<Account[]> {
  return listItems(`/accounts`, AccountSchema);
}

export function getAccountBalances(): Promise<AccountBalance[]> {
  return api.get(`/accounts/balances`, z.array(AccountBalanceSchema));
}

// ---- Split: people, splits, balances ----
export function listPeople(): Promise<Person[]> {
  return listItems(`/people`, PersonSchema);
}

export function createPerson(input: CreatePersonInput): Promise<Person> {
  return api.post(`/people`, input, PersonSchema);
}

/** Nudge a person to settle up (records an in-app settle_reminder). */
export function remindPerson(personId: string): Promise<void> {
  return api.post(`/people/${personId}/remind`, undefined);
}

// ---- Split: groups ----
export function listGroups(): Promise<Group[]> {
  return api.get(`/groups`, z.array(GroupSchema));
}

export function createGroup(input: CreateGroupInput): Promise<Group> {
  return api.post(`/groups`, input, GroupSchema);
}

export function listSplits(): Promise<Split[]> {
  return listItems(`/splits`, SplitSchema);
}

export function createSplit(input: CreateSplitInput): Promise<Split> {
  return api.post(`/splits`, input, SplitSchema);
}

export function getBalances(): Promise<BalanceT[]> {
  return api.get(`/balances`, z.array(Balance));
}

const SettlementPage = Page(SettlementSchema);

export function listSettlements(): Promise<z.infer<typeof SettlementPage>> {
  return api.get(`/settlements`, SettlementPage);
}

export function createSettlement(input: CreateSettlementInput): Promise<Settlement> {
  return api.post(`/settlements`, input, SettlementSchema);
}

// ---- Recap (insights) ----
export function getRecap(month: string): Promise<MonthlySummary> {
  return api.get(`/recaps/${month}`, MonthlySummarySchema);
}

// ---- Current user (settings) ----
export function getMe(): Promise<User> {
  return api.get(`/me`, UserSchema);
}

export function updateMe(input: UpdateUserInput): Promise<User> {
  return api.patch(`/me`, input, UserSchema);
}

// ---- Receipts (OCR) ----
const ReceiptPage = Page(ReceiptSchema);

// The presign response shape is owned by @spendlio/contracts (PresignedUploadSchema),
// shared with @spendlio/storage — re-exported here for the web's callers.
export type { PresignedUpload };

export function listReceipts(): Promise<z.infer<typeof ReceiptPage>> {
  return api.get(`/receipts`, ReceiptPage);
}

export function getReceipt(id: string): Promise<Receipt> {
  return api.get(`/receipts/${id}`, ReceiptSchema);
}

/** A short-lived presigned URL to view the receipt's uploaded image. */
export async function getReceiptImageUrl(id: string): Promise<string> {
  const { url } = await api.get<{ url: string }>(`/receipts/${id}/image-url`, z.object({ url: z.string().url() }));
  return url;
}

/** Step 1 of upload: ask the API for a short-lived PUT url for this MIME type.
 *  The content hash makes the storage key content-addressed (dedup-friendly). */
export function presignReceipt(contentType: string, sha256?: string): Promise<PresignedUpload> {
  const qs = `?contentType=${encodeURIComponent(contentType)}${sha256 ? `&sha256=${sha256}` : ''}`;
  return api.post(`/receipts/presign${qs}`, undefined, PresignedUploadSchema);
}

/** Step 3 of upload: register the uploaded object key → creates the row + enqueues OCR. */
export function registerReceipt(input: CreateReceiptInput): Promise<Receipt> {
  return api.post(`/receipts`, input, ReceiptSchema);
}

/** Approve a reviewed receipt → creates the linked expense, returns it. */
export function confirmReceipt(id: string, input: ConfirmReceiptInput): Promise<Transaction> {
  return api.post(`/receipts/${id}/confirm`, input, TransactionSchema);
}

/** Re-run OCR on a failed receipt → back to 'processing'. Returns the updated receipt. */
export function retryReceipt(id: string): Promise<Receipt> {
  return api.post(`/receipts/${id}/retry`, undefined, ReceiptSchema);
}

export type {
  Transaction,
  Budget,
  BudgetStatus,
  Category,
  Account,
  AccountBalance,
  Person,
  Group,
  Split,
  BalanceT as Balance,
  MonthlySummary,
  User,
  Receipt,
  Settlement,
};
