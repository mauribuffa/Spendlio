The foundational surface — white, 22px radius, hairline border, soft shadow. Wrap most content in one.

```jsx
<Card title="This month" action={<IconButton icon={<MoreIcon/>} label="More"/>}>
  …
</Card>
<Card variant="brand" padded>…</Card>
<Card variant="inverse">…</Card>   {/* dark green hero / balance panel */}
```

Variants: `default | flat | raised | inverse | brand`. Set `padded={false}` for lists/tables that manage their own padding. `interactive` adds hover lift.
