Money entry field — currency prefix, big tabular figures. The hero size is the centerpiece of the "Add expense" screen.

```jsx
<AmountInput value={amount} onChange={e=>setAmount(e.target.value)} />        {/* hero */}
<AmountInput size="compact" currency="$" value={each} onChange={...} />        {/* inline */}
```

`size`: `hero` (large, centered) or `compact` (44px inline field).
