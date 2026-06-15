Labelled text input — the standard single-line field. 12px radius (softer than pill), green focus ring.

```jsx
<Input label="Description" placeholder="e.g. Dinner at Olio" />
<Input label="Email" leadingIcon={<MailIcon/>} hint="We'll send the receipt here" />
<Input label="Amount" error="Enter a number greater than 0" />
```

Pass `error` to show the rose error state. Use `AmountInput` for money entry.
