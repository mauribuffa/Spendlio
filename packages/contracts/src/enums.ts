import { z } from 'zod';

export const CategoryKey = z.enum([
  'groceries','dining','transport','housing','utilities','shopping',
  'health','entertainment','travel','subscriptions','income','transfer',
]);
export type CategoryKey = z.infer<typeof CategoryKey>;

export const CategoryKind = z.enum(['expense','income','transfer']);
export type CategoryKind = z.infer<typeof CategoryKind>;

export const AccountType = z.enum(['card','checking','savings','cash']);
export type AccountType = z.infer<typeof AccountType>;

export const TransactionSource = z.enum(['manual','import','ocr','recurring']);
export type TransactionSource = z.infer<typeof TransactionSource>;

export const TransactionStatus = z.enum(['cleared','pending','split','recurring','income']);
export type TransactionStatus = z.infer<typeof TransactionStatus>;

export const SplitMode = z.enum(['even','exact','percent']);
export type SplitMode = z.infer<typeof SplitMode>;

export const ReceiptStatus = z.enum(['processing','parsed','failed']);
export type ReceiptStatus = z.infer<typeof ReceiptStatus>;

export const ReceiptFailureReason = z.enum(['timeout','unreadable','image_unavailable','unknown']);
export type ReceiptFailureReason = z.infer<typeof ReceiptFailureReason>;

export const SettlementStatus = z.enum(['pending','settled']);
export type SettlementStatus = z.infer<typeof SettlementStatus>;
