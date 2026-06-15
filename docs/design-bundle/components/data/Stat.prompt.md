KPI stat — uppercase label, big Space Grotesk figure, and a signed delta with a trend arrow. Color reflects whether the change is *good*, not just its sign.

```jsx
<Stat label="Spent this month" value="$2,480" delta="−12%" deltaCaption="vs April" goodWhen="down" />
<Stat label="Income" value="$3,200" delta="+4%" goodWhen="up" />
```

`goodWhen="down"` makes a decrease green (spending); the default `up` makes an increase green (income/savings). Requires `lucide.createIcons()` after mount.
