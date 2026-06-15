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
  SplitSchema,
  type Split,
  type CreateSplitInput,
  Balance,
  type Balance as BalanceT,
  MonthlySummarySchema,
  type MonthlySummary,
  UserSchema,
  type User,
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

// ---- Budgets ----
export function listBudgets(): Promise<Budget[]> {
  return api.get(`/budgets`, z.array(BudgetSchema));
}

export function getBudgetStatus(): Promise<BudgetStatus[]> {
  return api.get(`/budgets/status`, z.array(BudgetStatus));
}

export function createBudget(input: CreateBudgetInput): Promise<Budget> {
  return api.post(`/budgets`, input, BudgetSchema);
}

// ---- Categories ----
export function listCategories(): Promise<Category[]> {
  return api.get(`/categories`, z.array(CategorySchema));
}

// ---- Accounts ----
export function listAccounts(): Promise<Account[]> {
  return api.get(`/accounts`, z.array(AccountSchema));
}

export function getAccountBalances(): Promise<AccountBalance[]> {
  return api.get(`/accounts/balances`, z.array(AccountBalanceSchema));
}

// ---- Split: people, splits, balances ----
export function listPeople(): Promise<Person[]> {
  return api.get(`/people`, z.array(PersonSchema));
}

export function createPerson(input: CreatePersonInput): Promise<Person> {
  return api.post(`/people`, input, PersonSchema);
}

export function listSplits(): Promise<Split[]> {
  return api.get(`/splits`, z.array(SplitSchema));
}

export function createSplit(input: CreateSplitInput): Promise<Split> {
  return api.post(`/splits`, input, SplitSchema);
}

export function getBalances(): Promise<BalanceT[]> {
  return api.get(`/balances`, z.array(Balance));
}

// ---- Recap (insights) ----
export function getRecap(month: string): Promise<MonthlySummary> {
  return api.get(`/recaps/${month}`, MonthlySummarySchema);
}

// ---- Current user (settings) ----
export function getMe(): Promise<User> {
  return api.get(`/me`, UserSchema);
}

export type {
  Transaction,
  Budget,
  BudgetStatus,
  Category,
  Account,
  AccountBalance,
  Person,
  Split,
  BalanceT as Balance,
  MonthlySummary,
  User,
};
