Formatted monetary figure — always tabular numerals; sign and color carry meaning. Use everywhere money is shown.

```jsx
<MoneyAmount value={-24.5} />                         {/* −$24.50, rose */}
<MoneyAmount value={1200} signed />                    {/* +$1,200.00, green */}
<MoneyAmount value={2480.5} display size={34} />        {/* big hero figure */}
```

`tone="auto"` colors by sign; force `neutral` for plain ledger figures. `display` switches to Space Grotesk.
