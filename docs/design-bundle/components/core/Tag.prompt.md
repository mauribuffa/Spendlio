Filter / category chip — selectable (toggles a filter), removable (applied filter), or static (read-only category).

```jsx
<Tag selectable selected color="#1B6E4F">Groceries</Tag>
<Tag onRemove={() => removeFilter('may')}>May 2026</Tag>
<Tag color="#3A6BAB">Transport</Tag>
```

Pass `color` for a category dot. `selectable` + `selected` make it a toggle; `onRemove` adds a trailing ×.
