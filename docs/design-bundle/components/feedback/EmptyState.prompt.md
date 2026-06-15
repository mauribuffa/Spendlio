Warm, single-action empty state — one clear next step, calm copy, no exclamation overload.

```jsx
<EmptyState icon="receipt-text" title="No expenses yet"
  message="Add your first one to start tracking where your money goes."
  action={<Button leadingIcon={<PlusIcon/>}>Add expense</Button>} />
```

Keep to one action. Call `lucide.createIcons()` after mount when using a string icon.
