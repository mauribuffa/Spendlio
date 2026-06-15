Budget / goal progress bar — green fill, automatically turns rose when over budget.

```jsx
<ProgressBar label="Dining" valueLabel="$420 / $500" value={420} max={500} />
<ProgressBar value={560} max={500} label="Shopping" valueLabel="$560 / $500" />  {/* over → rose */}
```

Pass `color` to force a category color. `size="lg"` for a chunkier track.
