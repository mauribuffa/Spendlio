Quiet confirmation toast on the dark green surface — "Expense added", "Reminder sent". Keep copy short and calm.

```jsx
<Toast title="Expense added" message="Split with Maya · $24.50 each" />
<Toast tone="info" title="Reminder sent to Maya" actionLabel="Undo" onAction={undo} />
```

Tones: `success | error | info`. Call `lucide.createIcons()` after mount.
