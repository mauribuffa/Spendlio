// Naming convention (see CLAUDE.md → Naming & conventions):
//  - Persisted entities expose `XSchema` + an inferred `type X`
//    (e.g. TransactionSchema/Transaction), and write DTOs as CreateXInput/UpdateXInput.
//  - Small computed value-objects are exported under their bare domain name as
//    both the schema and the type (e.g. `Money`, `Balance`, `BudgetStatus`,
//    `CategorySpend`) — they're values, not stored rows, so they read better
//    unsuffixed. `AccountBalanceSchema` is the one historical exception.
export * from './money';
export * from './enums';
export * from './common';
export * from './user';
export * from './auth';
export * from './account';
export * from './category';
export * from './transaction';
export * from './budget';
export * from './receipt';
export * from './split';
export * from './recap';
export * from './jobs';
