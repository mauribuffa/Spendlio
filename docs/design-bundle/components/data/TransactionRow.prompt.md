The backbone list row — category glyph, title, subtitle, and a right-aligned amount. Composes `CategoryIcon` + `MoneyAmount`.

```jsx
<TransactionRow title="Whole Foods" category="groceries"
  merchant="Card ••4821" subtitle="Split with Maya" amount={-58.20} meta="Today" />
<TransactionRow title="Salary" category="income" amount={3200} signed
  rightSlot={<Badge tone="positive">Income</Badge>} />
```

Use `leftSlot` to show an `Avatar` (for people-centric rows) and `rightSlot` for a badge instead of an amount. Pass `onClick` to make it a button.
