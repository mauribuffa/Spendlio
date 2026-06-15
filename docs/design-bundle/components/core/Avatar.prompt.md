Circular user avatar — a photo, or deterministic tinted initials when there's no photo. `AvatarGroup` overlaps several for split groups.

```jsx
<Avatar name="Maya Okafor" size="md" />
<Avatar name="Sam" src="/sam.jpg" size="lg" />
<AvatarGroup people={[{name:'Maya'},{name:'Sam'},{name:'Lee'},{name:'Ari'},{name:'Jo'}]} max={4} />
```

Sizes `xs | sm | md | lg | xl`. The tint is hashed from `name` using the data-viz palette, so the same person is always the same color.
