# UI Package Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the deleted `packages/ui` design-system package from git and add the 8 missing components so the full Spendlio design system (20 components) exists in the repo.

**Architecture:** `@spendlio/ui` is consumed straight from TypeScript source (`main`/`types` → `src/index.ts`), no build step. Components are `.tsx` using `forwardRef`, props extending the relevant HTML attributes, styled via the repo's **semantic CSS custom properties** (defined in `src/styles.css`). Interaction states / multi-element component CSS live in `src/styles.css` under `.spl-*` classes (extending the existing convention). Fonts are NOT imported here — the web app supplies them via `next/font` and aliases `--font-display/body/mono`.

**Tech Stack:** React 19, TypeScript (strict), Vitest + @testing-library/react (jsdom), lucide-react.

---

## Context the worker must know

- **The package was deleted only in the working tree; HEAD still has it.** Restore with `git checkout HEAD -- packages/ui`.
- The 8 new components are ported from the Claude Design bundle prototypes. The prototypes use a *different* token vocabulary; this plan already translates every token to the repo's vocabulary. **Use the code in this plan verbatim — do not copy the bundle's `--text-muted` / `--action-primary` / `--focus-ring` names.**
- **Token translation reference** (bundle → repo) used throughout this plan:
  | Bundle | Repo |
  |---|---|
  | `--font-sans` | `--font-body` |
  | `--text-strong`, `--text-body` | `--color-ink` |
  | `--text-muted` | `--color-ink-muted` |
  | `--text-subtle`, `--text-disabled` | `--color-ink-subtle` |
  | `--surface-card` | `--color-surface` |
  | `--surface-sunken`, `--surface-inset` | `--neutral-100` |
  | `--surface-brand-sub` | `--green-50` |
  | `--action-primary` | `--color-primary` |
  | `--action-primary-hover` | `--green-700` |
  | `--border-default`, `--border-subtle` | `--color-border` |
  | `--border-strong` | `--neutral-400` |
  | `--border-focus` | `--color-primary` |
  | `--dur-fast` | `--motion-fast` |
  | `--ease-standard`, `--ease-inout` | `--ease-out` |
  | `--radius-input` | `--radius-md` |
  | `--radius-lg`, `--radius-2xl` | `--radius-card` |
  | focus ring | `outline: 2px solid var(--color-focus-ring); outline-offset: 2px` |
- Run all package commands with the filter: `pnpm --filter @spendlio/ui <script>`.

---

## Task 1: Restore the package from git

**Files:**
- Restore: `packages/ui/**` (entire directory)

- [ ] **Step 1: Restore the working tree from HEAD**

Run:
```bash
git checkout HEAD -- packages/ui
```

- [ ] **Step 2: Install (in case the workspace symlink was dropped) and verify it builds green**

Run:
```bash
pnpm install
pnpm --filter @spendlio/ui typecheck
pnpm --filter @spendlio/ui test
```
Expected: typecheck exits 0; vitest runs the existing component tests (Button, CategoryIcon, MoneyAmount) and all PASS.

- [ ] **Step 3: Confirm the 12 existing components are present**

Run:
```bash
ls packages/ui/src/components
```
Expected: `Avatar Badge Button Card CategoryIcon Input MoneyAmount ProgressBar SegmentedControl Stat Toast TransactionRow` (+ their `.test.tsx` where present).

- [ ] **Step 4: Commit the restore**

```bash
git add packages/ui
git commit -m "feat(ui): restore design-system package (12 components + tokens)"
```

---

## Task 2: IconButton

**Files:**
- Create: `packages/ui/src/components/IconButton.tsx`
- Create: `packages/ui/src/components/IconButton.test.tsx`
- Modify: `packages/ui/src/styles.css` (append `.spl-iconbtn` block)
- Modify: `packages/ui/src/index.ts` (add export)

- [ ] **Step 1: Write the failing test**

`packages/ui/src/components/IconButton.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('exposes the label as accessible name and title', () => {
    render(<IconButton label="Add account" icon={<svg />} />);
    const btn = screen.getByRole('button', { name: 'Add account' });
    expect(btn).toHaveClass('spl-iconbtn');
    expect(btn).toHaveAttribute('title', 'Add account');
  });

  it('defaults to ghost/md and type=button', () => {
    render(<IconButton label="More" icon={<svg />} />);
    const btn = screen.getByRole('button', { name: 'More' });
    expect(btn).toHaveAttribute('data-variant', 'ghost');
    expect(btn).toHaveAttribute('data-size', 'md');
    expect(btn).toHaveAttribute('type', 'button');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @spendlio/ui test -- IconButton`
Expected: FAIL — cannot resolve `./IconButton`.

- [ ] **Step 3: Write the component**

`packages/ui/src/components/IconButton.tsx`:
```tsx
import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../cn';

export type IconButtonVariant = 'ghost' | 'solid' | 'brand';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon element (e.g. a lucide-react icon). */
  icon: ReactNode;
  /** Accessible label — required (rendered as aria-label + title). */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

/** Circular icon-only button for toolbars, headers and row affordances. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = 'ghost', size = 'md', className, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      aria-label={label}
      title={label}
      data-variant={variant}
      data-size={size}
      className={cn('spl-iconbtn', className)}
      {...rest}
    >
      {icon}
    </button>
  );
});
```

- [ ] **Step 4: Append the CSS to `packages/ui/src/styles.css`** (after the existing `.spl-segmented__option[data-active='true']` block)

```css
/* ---- IconButton ---- */
.spl-iconbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-ink-muted);
  cursor: pointer;
  flex: none;
  transition: background var(--motion-fast) var(--ease-out), color var(--motion-fast) var(--ease-out), transform var(--motion-fast) var(--ease-out);
}
.spl-iconbtn:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
.spl-iconbtn:active:not(:disabled) { transform: scale(var(--press-scale)); }
.spl-iconbtn:disabled { opacity: 0.45; pointer-events: none; }
.spl-iconbtn[data-size='sm'] { width: 32px; height: 32px; }
.spl-iconbtn[data-size='md'] { width: 40px; height: 40px; }
.spl-iconbtn[data-size='lg'] { width: 48px; height: 48px; }
.spl-iconbtn[data-size='sm'] svg { width: 16px; height: 16px; }
.spl-iconbtn[data-size='md'] svg { width: 19px; height: 19px; }
.spl-iconbtn[data-size='lg'] svg { width: 22px; height: 22px; }
.spl-iconbtn[data-variant='ghost']:hover:not(:disabled) { background: var(--neutral-100); color: var(--color-ink); }
.spl-iconbtn[data-variant='solid'] { background: var(--color-surface); border-color: var(--color-border); box-shadow: var(--shadow-sm); }
.spl-iconbtn[data-variant='solid']:hover:not(:disabled) { background: var(--neutral-100); color: var(--color-ink); }
.spl-iconbtn[data-variant='brand'] { background: var(--color-primary); color: var(--color-on-primary); }
.spl-iconbtn[data-variant='brand']:hover:not(:disabled) { background: var(--green-700); }
```

- [ ] **Step 5: Add the export to `packages/ui/src/index.ts`** (after the `Button` exports)

```ts
export { IconButton } from './components/IconButton';
export type { IconButtonProps, IconButtonVariant, IconButtonSize } from './components/IconButton';
```

- [ ] **Step 6: Run test + typecheck**

Run: `pnpm --filter @spendlio/ui test -- IconButton && pnpm --filter @spendlio/ui typecheck`
Expected: PASS, typecheck 0.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/components/IconButton.tsx packages/ui/src/components/IconButton.test.tsx packages/ui/src/styles.css packages/ui/src/index.ts
git commit -m "feat(ui): add IconButton"
```

---

## Task 3: Tag

**Files:**
- Create: `packages/ui/src/components/Tag.tsx`
- Create: `packages/ui/src/components/Tag.test.tsx`
- Modify: `packages/ui/src/styles.css`, `packages/ui/src/index.ts`

- [ ] **Step 1: Write the failing test**

`packages/ui/src/components/Tag.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tag } from './Tag';

describe('Tag', () => {
  it('renders children and the base class', () => {
    render(<Tag>Groceries</Tag>);
    const el = screen.getByText('Groceries');
    expect(el).toHaveClass('spl-tag');
  });

  it('reflects pressed state when selectable', () => {
    render(<Tag selectable selected>Dining</Tag>);
    expect(screen.getByRole('button', { name: 'Dining' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('fires onRemove from the trailing affordance', () => {
    const onRemove = vi.fn();
    render(<Tag onRemove={onRemove}>Trip</Tag>);
    fireEvent.click(screen.getByLabelText('Remove'));
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @spendlio/ui test -- Tag`
Expected: FAIL — cannot resolve `./Tag`.

- [ ] **Step 3: Write the component**

`packages/ui/src/components/Tag.tsx`:
```tsx
import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { cn } from '../cn';

export interface TagProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Selected (pressed) state — used with selectable filter chips. */
  selected?: boolean;
  /** Marks the chip as a toggle (renders aria-pressed). */
  selectable?: boolean;
  /** A leading category color dot. */
  color?: string | null;
  /** Optional leading icon. */
  icon?: ReactNode;
  /** When provided, renders a trailing × that calls this. */
  onRemove?: ((e: MouseEvent) => void) | null;
  children?: ReactNode;
}

/** Filter / category chip — selectable, removable, or static. */
export const Tag = forwardRef<HTMLButtonElement, TagProps>(function Tag(
  { children, selected = false, selectable = false, color = null, icon = null, onRemove = null, className, type, ...rest },
  ref,
) {
  const isStatic = !selectable && !onRemove;
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      data-static={isStatic}
      aria-pressed={selectable ? selected : undefined}
      className={cn('spl-tag', className)}
      {...rest}
    >
      {color && <span className="spl-tag__dot" style={{ background: color }} />}
      {icon}
      {children}
      {onRemove && (
        <span
          className="spl-tag__x"
          role="button"
          aria-label="Remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(e);
          }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </span>
      )}
    </button>
  );
});
```

- [ ] **Step 4: Append the CSS to `packages/ui/src/styles.css`**

```css
/* ---- Tag ---- */
.spl-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-body);
  font-weight: var(--weight-medium);
  font-size: var(--text-sm);
  line-height: 1;
  padding: 7px 12px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  background: var(--color-surface);
  color: var(--color-ink);
  border: 1px solid var(--color-border);
  transition: background var(--motion-fast) var(--ease-out);
}
.spl-tag:hover { background: var(--neutral-100); }
.spl-tag:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
.spl-tag[aria-pressed='true'] { background: var(--green-50); border-color: var(--green-300); color: var(--green-800); font-weight: var(--weight-semibold); }
.spl-tag[data-static='true'] { cursor: default; }
.spl-tag[data-static='true']:hover { background: var(--color-surface); }
.spl-tag__dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
.spl-tag__x { display: inline-flex; margin-right: -3px; opacity: 0.6; cursor: pointer; }
.spl-tag__x:hover { opacity: 1; }
```

- [ ] **Step 5: Add the export to `packages/ui/src/index.ts`**

```ts
export { Tag } from './components/Tag';
export type { TagProps } from './components/Tag';
```

- [ ] **Step 6: Run test + typecheck**

Run: `pnpm --filter @spendlio/ui test -- Tag && pnpm --filter @spendlio/ui typecheck`
Expected: PASS, typecheck 0.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/components/Tag.tsx packages/ui/src/components/Tag.test.tsx packages/ui/src/styles.css packages/ui/src/index.ts
git commit -m "feat(ui): add Tag chip"
```

---

## Task 4: Select

**Files:**
- Create: `packages/ui/src/components/Select.tsx`
- Create: `packages/ui/src/components/Select.test.tsx`
- Modify: `packages/ui/src/styles.css`, `packages/ui/src/index.ts`

- [ ] **Step 1: Write the failing test**

`packages/ui/src/components/Select.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Select } from './Select';

describe('Select', () => {
  it('renders options from strings and objects', () => {
    render(<Select options={['USD', { value: 'ars', label: 'Pesos' }]} value="USD" onChange={() => {}} />);
    expect(screen.getByRole('option', { name: 'USD' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Pesos' })).toHaveValue('ars');
  });

  it('renders a label and a disabled placeholder', () => {
    render(<Select label="Currency" placeholder="Pick one" options={['USD']} />);
    expect(screen.getByText('Currency')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Pick one' })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @spendlio/ui test -- Select`
Expected: FAIL — cannot resolve `./Select`.

- [ ] **Step 3: Write the component**

`packages/ui/src/components/Select.tsx`:
```tsx
import { forwardRef } from 'react';
import type { ReactNode, SelectHTMLAttributes } from 'react';
import { cn } from '../cn';

export interface SelectOption {
  value: string;
  label?: ReactNode;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  /** Options as {value,label} or plain strings. */
  options: (SelectOption | string)[];
  placeholder?: string | null;
}

/** Styled native dropdown — category, account, currency, group pickers. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label = null, options, placeholder = null, className, ...rest },
  ref,
) {
  return (
    <div className={cn('spl-select', className)}>
      {label && <label className="spl-select__label">{label}</label>}
      <div className="spl-select__box">
        <select ref={ref} {...rest}>
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o, i) => {
            const opt = typeof o === 'string' ? { value: o, label: o } : o;
            return (
              <option key={i} value={opt.value}>
                {opt.label ?? opt.value}
              </option>
            );
          })}
        </select>
        <span className="spl-select__chevron" aria-hidden>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </div>
    </div>
  );
});
```

- [ ] **Step 4: Append the CSS to `packages/ui/src/styles.css`**

```css
/* ---- Select ---- */
.spl-select { display: flex; flex-direction: column; gap: 6px; font-family: var(--font-body); }
.spl-select__label { font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--color-ink); }
.spl-select__box {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  height: 44px;
  transition: border-color var(--motion-fast) var(--ease-out);
}
.spl-select__box:focus-within { border-color: var(--color-primary); }
.spl-select select {
  appearance: none;
  -webkit-appearance: none;
  border: none;
  outline: none;
  background: none;
  font: inherit;
  font-size: var(--text-base);
  color: var(--color-ink);
  padding: 0 40px 0 14px;
  height: 100%;
  width: 100%;
  cursor: pointer;
}
.spl-select__chevron { position: absolute; right: 14px; pointer-events: none; color: var(--color-ink-subtle); display: inline-flex; }
```

- [ ] **Step 5: Add the export to `packages/ui/src/index.ts`**

```ts
export { Select } from './components/Select';
export type { SelectProps, SelectOption } from './components/Select';
```

- [ ] **Step 6: Run test + typecheck**

Run: `pnpm --filter @spendlio/ui test -- Select && pnpm --filter @spendlio/ui typecheck`
Expected: PASS, typecheck 0.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/components/Select.tsx packages/ui/src/components/Select.test.tsx packages/ui/src/styles.css packages/ui/src/index.ts
git commit -m "feat(ui): add Select"
```

---

## Task 5: Switch

**Files:**
- Create: `packages/ui/src/components/Switch.tsx`
- Create: `packages/ui/src/components/Switch.test.tsx`
- Modify: `packages/ui/src/styles.css`, `packages/ui/src/index.ts`

- [ ] **Step 1: Write the failing test**

`packages/ui/src/components/Switch.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Switch } from './Switch';

describe('Switch', () => {
  it('renders a switch-role checkbox reflecting checked', () => {
    render(<Switch checked onChange={() => {}} label="Split evenly" />);
    const input = screen.getByRole('switch');
    expect(input).toBeChecked();
    expect(screen.getByText('Split evenly')).toBeInTheDocument();
  });

  it('calls onChange when toggled', () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @spendlio/ui test -- Switch`
Expected: FAIL — cannot resolve `./Switch`.

- [ ] **Step 3: Write the component**

`packages/ui/src/components/Switch.tsx`:
```tsx
import { forwardRef } from 'react';
import type { ChangeEventHandler, InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../cn';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  /** Optional trailing label. */
  label?: ReactNode;
}

/** On/off toggle — settings, "split evenly", recurring, notifications. */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { checked, onChange, label = null, disabled = false, className, ...rest },
  ref,
) {
  return (
    <label className={cn('spl-switch', disabled && 'spl-switch--disabled', className)}>
      <input ref={ref} type="checkbox" role="switch" checked={checked} onChange={onChange} disabled={disabled} {...rest} />
      <span className="spl-switch__track">
        <span className="spl-switch__thumb" />
      </span>
      {label && <span>{label}</span>}
    </label>
  );
});
```

- [ ] **Step 4: Append the CSS to `packages/ui/src/styles.css`**

```css
/* ---- Switch ---- */
.spl-switch { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; font-family: var(--font-body); font-size: var(--text-sm); color: var(--color-ink); user-select: none; }
.spl-switch input { position: absolute; opacity: 0; width: 0; height: 0; }
.spl-switch__track { width: 44px; height: 26px; border-radius: var(--radius-pill); background: var(--neutral-300); position: relative; flex: none; transition: background var(--motion-fast) var(--ease-out); }
.spl-switch__thumb { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: var(--shadow-sm); transition: transform var(--motion-fast) var(--ease-out); }
.spl-switch input:checked + .spl-switch__track { background: var(--color-primary); }
.spl-switch input:checked + .spl-switch__track .spl-switch__thumb { transform: translateX(18px); }
.spl-switch input:focus-visible + .spl-switch__track { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
.spl-switch--disabled { opacity: 0.5; pointer-events: none; }
```

- [ ] **Step 5: Add the export to `packages/ui/src/index.ts`**

```ts
export { Switch } from './components/Switch';
export type { SwitchProps } from './components/Switch';
```

- [ ] **Step 6: Run test + typecheck**

Run: `pnpm --filter @spendlio/ui test -- Switch && pnpm --filter @spendlio/ui typecheck`
Expected: PASS, typecheck 0.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/components/Switch.tsx packages/ui/src/components/Switch.test.tsx packages/ui/src/styles.css packages/ui/src/index.ts
git commit -m "feat(ui): add Switch"
```

---

## Task 6: Checkbox

**Files:**
- Create: `packages/ui/src/components/Checkbox.tsx`
- Create: `packages/ui/src/components/Checkbox.test.tsx`
- Modify: `packages/ui/src/styles.css`, `packages/ui/src/index.ts`

- [ ] **Step 1: Write the failing test**

`packages/ui/src/components/Checkbox.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('renders a checkbox with a label', () => {
    render(<Checkbox checked onChange={() => {}} label="Maya" />);
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(screen.getByText('Maya')).toBeInTheDocument();
  });

  it('calls onChange when clicked', () => {
    const onChange = vi.fn();
    render(<Checkbox checked={false} onChange={onChange} label="Sam" />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @spendlio/ui test -- Checkbox`
Expected: FAIL — cannot resolve `./Checkbox`.

- [ ] **Step 3: Write the component**

`packages/ui/src/components/Checkbox.tsx`:
```tsx
import { forwardRef } from 'react';
import type { ChangeEventHandler, InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  label?: ReactNode;
  /** Render as a circle (e.g. selecting people in a split). */
  round?: boolean;
}

/** Checkbox — multi-select rows, "who's in this split", terms. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { checked, onChange, label = null, round = false, disabled = false, className, ...rest },
  ref,
) {
  return (
    <label className={cn('spl-check', round && 'spl-check--round', disabled && 'spl-check--disabled', className)}>
      <input ref={ref} type="checkbox" checked={checked} onChange={onChange} disabled={disabled} {...rest} />
      <span className="spl-check__box">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      {label && <span>{label}</span>}
    </label>
  );
});
```

- [ ] **Step 4: Append the CSS to `packages/ui/src/styles.css`**

```css
/* ---- Checkbox ---- */
.spl-check { display: inline-flex; align-items: flex-start; gap: 10px; cursor: pointer; font-family: var(--font-body); font-size: var(--text-sm); color: var(--color-ink); user-select: none; line-height: 1.4; }
.spl-check input { position: absolute; opacity: 0; width: 0; height: 0; }
.spl-check__box { width: 20px; height: 20px; border-radius: 6px; border: 1.5px solid var(--neutral-400); background: var(--color-surface); flex: none; display: inline-flex; align-items: center; justify-content: center; transition: background var(--motion-fast) var(--ease-out); margin-top: 1px; color: #fff; }
.spl-check__box svg { opacity: 0; transform: scale(0.6); transition: opacity var(--motion-fast) var(--ease-out), transform var(--motion-fast) var(--ease-out); }
.spl-check input:checked + .spl-check__box { background: var(--color-primary); border-color: var(--color-primary); }
.spl-check input:checked + .spl-check__box svg { opacity: 1; transform: scale(1); }
.spl-check input:focus-visible + .spl-check__box { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
.spl-check--round .spl-check__box { border-radius: 50%; }
.spl-check--disabled { opacity: 0.5; pointer-events: none; }
```

- [ ] **Step 5: Add the export to `packages/ui/src/index.ts`**

```ts
export { Checkbox } from './components/Checkbox';
export type { CheckboxProps } from './components/Checkbox';
```

- [ ] **Step 6: Run test + typecheck**

Run: `pnpm --filter @spendlio/ui test -- Checkbox && pnpm --filter @spendlio/ui typecheck`
Expected: PASS, typecheck 0.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/components/Checkbox.tsx packages/ui/src/components/Checkbox.test.tsx packages/ui/src/styles.css packages/ui/src/index.ts
git commit -m "feat(ui): add Checkbox"
```

---

## Task 7: AmountInput

**Files:**
- Create: `packages/ui/src/components/AmountInput.tsx`
- Create: `packages/ui/src/components/AmountInput.test.tsx`
- Modify: `packages/ui/src/styles.css`, `packages/ui/src/index.ts`

- [ ] **Step 1: Write the failing test**

`packages/ui/src/components/AmountInput.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AmountInput } from './AmountInput';

describe('AmountInput', () => {
  it('shows the currency prefix and the value with tabular figures', () => {
    render(<AmountInput value="42.50" currency="$" onChange={() => {}} />);
    expect(screen.getByText('$')).toBeInTheDocument();
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('42.50');
    expect(input).toHaveAttribute('data-money');
  });

  it('calls onChange when typing', () => {
    const onChange = vi.fn();
    render(<AmountInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '12' } });
    expect(onChange).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @spendlio/ui test -- AmountInput`
Expected: FAIL — cannot resolve `./AmountInput`.

- [ ] **Step 3: Write the component**

`packages/ui/src/components/AmountInput.tsx`:
```tsx
import { forwardRef } from 'react';
import type { ChangeEventHandler, InputHTMLAttributes } from 'react';
import { cn } from '../cn';

export type AmountInputSize = 'hero' | 'compact';

export interface AmountInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  value?: string | number;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  /** Currency symbol shown before the figure. */
  currency?: string;
  /** 'hero' = big centered entry (Add expense); 'compact' = inline field. */
  size?: AmountInputSize;
}

/** Money entry field with currency prefix and tabular figures. */
export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(function AmountInput(
  { value, onChange, currency = '$', placeholder = '0.00', size = 'hero', className, ...rest },
  ref,
) {
  return (
    <div className={cn('spl-amount', size === 'compact' && 'spl-amount--compact', className)}>
      <span className="spl-amount__cur">{currency}</span>
      <input ref={ref} inputMode="decimal" value={value} onChange={onChange} placeholder={placeholder} data-money {...rest} />
    </div>
  );
});
```

- [ ] **Step 4: Append the CSS to `packages/ui/src/styles.css`**

```css
/* ---- AmountInput ---- */
.spl-amount { display: flex; align-items: center; justify-content: center; gap: 4px; font-family: var(--font-display); color: var(--color-ink); background: var(--neutral-100); border-radius: var(--radius-card); padding: 18px 24px; border: 1px solid transparent; transition: border-color var(--motion-fast) var(--ease-out); }
.spl-amount:focus-within { background: var(--color-surface); border-color: var(--color-primary); }
.spl-amount__cur { font-size: 28px; font-weight: var(--weight-medium); color: var(--color-ink-muted); align-self: flex-start; margin-top: 6px; }
.spl-amount input { border: none; outline: none; background: none; font: inherit; font-weight: var(--weight-bold); font-size: 48px; letter-spacing: -0.02em; color: var(--color-ink); text-align: center; width: 100%; max-width: 320px; }
.spl-amount input::placeholder { color: var(--color-ink-subtle); }
.spl-amount--compact { padding: 0 14px; height: 44px; border: 1px solid var(--color-border); background: var(--color-surface); border-radius: var(--radius-md); }
.spl-amount--compact .spl-amount__cur { font-size: var(--text-base); margin-top: 0; font-family: var(--font-body); }
.spl-amount--compact input { font-size: var(--text-lg); text-align: left; }
```

- [ ] **Step 5: Add the export to `packages/ui/src/index.ts`**

```ts
export { AmountInput } from './components/AmountInput';
export type { AmountInputProps, AmountInputSize } from './components/AmountInput';
```

- [ ] **Step 6: Run test + typecheck**

Run: `pnpm --filter @spendlio/ui test -- AmountInput && pnpm --filter @spendlio/ui typecheck`
Expected: PASS, typecheck 0.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/components/AmountInput.tsx packages/ui/src/components/AmountInput.test.tsx packages/ui/src/styles.css packages/ui/src/index.ts
git commit -m "feat(ui): add AmountInput"
```

---

## Task 8: EmptyState

**Files:**
- Create: `packages/ui/src/components/EmptyState.tsx`
- Create: `packages/ui/src/components/EmptyState.test.tsx`
- Modify: `packages/ui/src/styles.css`, `packages/ui/src/index.ts`

**Note:** Unlike the bundle prototype (which accepted a Lucide *string* name and relied on `lucide.createIcons()`), this repo component takes the icon as a `ReactNode` (a lucide-react element). No string-icon path.

- [ ] **Step 1: Write the failing test**

`packages/ui/src/components/EmptyState.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders the title, message and action', () => {
    render(<EmptyState title="No accounts yet" message="Add one to get started" action={<button>Add account</button>} />);
    expect(screen.getByText('No accounts yet')).toBeInTheDocument();
    expect(screen.getByText('Add one to get started')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add account' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @spendlio/ui test -- EmptyState`
Expected: FAIL — cannot resolve `./EmptyState`.

- [ ] **Step 3: Write the component**

`packages/ui/src/components/EmptyState.tsx`:
```tsx
import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../cn';

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  /** A lucide-react icon element (or any node). */
  icon?: ReactNode;
  title: ReactNode;
  message?: ReactNode;
  /** A primary action (e.g. a Button). */
  action?: ReactNode;
}

/** Warm, single-action empty state. */
export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  { icon = null, title, message = null, action = null, className, ...rest },
  ref,
) {
  return (
    <div ref={ref} className={cn('spl-empty', className)} {...rest}>
      {icon && <span className="spl-empty__art">{icon}</span>}
      <span className="spl-empty__title">{title}</span>
      {message && <span className="spl-empty__msg">{message}</span>}
      {action && <span className="spl-empty__action">{action}</span>}
    </div>
  );
});
```

- [ ] **Step 4: Append the CSS to `packages/ui/src/styles.css`**

```css
/* ---- EmptyState ---- */
.spl-empty { display: flex; flex-direction: column; align-items: center; text-align: center; font-family: var(--font-body); padding: 36px 24px; gap: 6px; }
.spl-empty__art { width: 64px; height: 64px; border-radius: var(--radius-card); display: flex; align-items: center; justify-content: center; margin-bottom: 10px; background: var(--green-50); color: var(--green-600); }
.spl-empty__art svg { width: 28px; height: 28px; }
.spl-empty__title { font-family: var(--font-display); font-weight: var(--weight-bold); font-size: var(--text-lg); color: var(--color-ink); }
.spl-empty__msg { font-size: var(--text-sm); color: var(--color-ink-muted); max-width: 320px; line-height: 1.5; }
.spl-empty__action { margin-top: 12px; }
```

- [ ] **Step 5: Add the export to `packages/ui/src/index.ts`**

```ts
export { EmptyState } from './components/EmptyState';
export type { EmptyStateProps } from './components/EmptyState';
```

- [ ] **Step 6: Run test + typecheck**

Run: `pnpm --filter @spendlio/ui test -- EmptyState && pnpm --filter @spendlio/ui typecheck`
Expected: PASS, typecheck 0.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/components/EmptyState.tsx packages/ui/src/components/EmptyState.test.tsx packages/ui/src/styles.css packages/ui/src/index.ts
git commit -m "feat(ui): add EmptyState"
```

---

## Task 9: Skeleton (+ SkeletonRow)

**Files:**
- Create: `packages/ui/src/components/Skeleton.tsx`
- Create: `packages/ui/src/components/Skeleton.test.tsx`
- Modify: `packages/ui/src/styles.css`, `packages/ui/src/index.ts`

- [ ] **Step 1: Write the failing test**

`packages/ui/src/components/Skeleton.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton, SkeletonRow } from './Skeleton';

describe('Skeleton', () => {
  it('applies the base shimmer class and a circle modifier', () => {
    const { container } = render(<Skeleton circle width={40} />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('spl-skel');
    expect(el).toHaveClass('spl-skel--circle');
  });

  it('SkeletonRow renders a row scaffold', () => {
    const { container } = render(<SkeletonRow />);
    expect(container.querySelector('.spl-skel-row')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @spendlio/ui test -- Skeleton`
Expected: FAIL — cannot resolve `./Skeleton`.

- [ ] **Step 3: Write the component**

`packages/ui/src/components/Skeleton.tsx`:
```tsx
import type { CSSProperties, HTMLAttributes } from 'react';
import { cn } from '../cn';

export interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  width?: number | string;
  height?: number | string;
  /** Circular (avatar) placeholder — width is used as the diameter. */
  circle?: boolean;
  /** Text-line placeholder (rounded, em-height). */
  text?: boolean;
}

/** Shimmer loading placeholder. Prefer skeletons over spinners. */
export function Skeleton({ width = '100%', height = 16, circle = false, text = false, className, style, ...rest }: SkeletonProps) {
  const merged: CSSProperties = { width, height: circle ? width : height, ...style };
  return <span className={cn('spl-skel', circle && 'spl-skel--circle', text && 'spl-skel--text', className)} style={merged} {...rest} />;
}

/** Pre-composed transaction-row skeleton (avatar + two lines + amount). */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn('spl-skel-row', className)}>
      <Skeleton circle width={40} />
      <div className="spl-skel-row__body">
        <Skeleton width="55%" height={13} />
        <Skeleton width="35%" height={11} />
      </div>
      <Skeleton width={56} height={15} />
    </div>
  );
}
```

- [ ] **Step 4: Append the CSS to `packages/ui/src/styles.css`**

```css
/* ---- Skeleton ---- */
@keyframes spl-shimmer { 100% { background-position: -200% 0; } }
.spl-skel { display: block; border-radius: var(--radius-sm); background: linear-gradient(90deg, var(--neutral-100) 0%, var(--neutral-50) 40%, var(--neutral-100) 80%); background-size: 200% 100%; animation: spl-shimmer 1.4s var(--ease-out) infinite; }
@media (prefers-reduced-motion: reduce) { .spl-skel { animation: none; } }
.spl-skel--text { height: 0.8em; border-radius: var(--radius-xs); }
.spl-skel--circle { border-radius: 50%; }
.spl-skel-row { display: flex; align-items: center; gap: 13px; padding: 12px 4px; }
.spl-skel-row__body { flex: 1; display: flex; flex-direction: column; gap: 7px; }
```

- [ ] **Step 5: Add the export to `packages/ui/src/index.ts`**

```ts
export { Skeleton, SkeletonRow } from './components/Skeleton';
export type { SkeletonProps } from './components/Skeleton';
```

- [ ] **Step 6: Run test + typecheck**

Run: `pnpm --filter @spendlio/ui test -- Skeleton && pnpm --filter @spendlio/ui typecheck`
Expected: PASS, typecheck 0.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/components/Skeleton.tsx packages/ui/src/components/Skeleton.test.tsx packages/ui/src/styles.css packages/ui/src/index.ts
git commit -m "feat(ui): add Skeleton + SkeletonRow"
```

---

## Task 10: Whole-package verification

- [ ] **Step 1: Full package test + typecheck**

Run:
```bash
pnpm --filter @spendlio/ui test
pnpm --filter @spendlio/ui typecheck
```
Expected: all component tests PASS (12 restored + 8 new); typecheck 0.

- [ ] **Step 2: Confirm the web app still resolves all `@spendlio/ui` imports**

Run:
```bash
pnpm --filter web typecheck
```
Expected: 0 errors. (The web app imports `Card, Button, Input, Badge, Avatar, MoneyAmount, TransactionRow, CategoryIcon, ProgressBar, Stat, SegmentedControl` + `@spendlio/ui/styles.css` — all present.)

- [ ] **Step 3: Confirm the barrel exports all 20 components**

Run:
```bash
grep -c "export {" packages/ui/src/index.ts
```
Expected: at least 20 export lines (12 restored + 8 new; Skeleton exports two from one line).

- [ ] **Step 4: Update PROGRESS.md** (tick the UI package row + add a Build-Log entry per CLAUDE.md's "How to work").

- [ ] **Step 5: Commit**

```bash
git add PROGRESS.md
git commit -m "chore(ui): complete design system — 20 components, web resolves"
```

---

## Self-review notes
- Every new component has: a `.tsx`, a co-located test, a `.spl-*` CSS block in `styles.css`, and a barrel export — matching the existing 12.
- All tokens are repo-vocabulary; no bundle token names leak in.
- Icon props are `ReactNode` (lucide-react), per the locked decision — no CDN `data-lucide`.
- This plan adds **no** dependencies; `lucide-react`, `react`, vitest, testing-library are already in `packages/ui/package.json`.
