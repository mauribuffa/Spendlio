Pill-shaped call-to-action button — use for any primary or secondary action; labels are sentence-case verbs ("Add expense", "Settle up").

```jsx
<Button variant="primary" leadingIcon={<PlusIcon/>}>Add expense</Button>
<Button variant="secondary" size="sm">Edit</Button>
<Button variant="ghost">Cancel</Button>
```

Variants: `primary` (green, brand glow — the one main action per view), `secondary` (white, hairline border), `ghost` (text-green, tint on hover), `accent` (sand/gold — rare, premium moments), `danger` (rose — destructive), `quiet` (neutral fill). Sizes `sm | md | lg`. Use `accent` sparingly; never two primaries in one view.
