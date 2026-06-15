# Design reference — Spendlio

## What the design files are
The Spendlio **design system** and **UI kits** (in the parent project this bundle came from) are **design references created in HTML** — high-fidelity prototypes of the intended look and behavior, **not** production code to copy line-for-line. The task is to **recreate them in the target codebase** using its real patterns: in this build, that means **`packages/ui` (`@spendlio/ui`)** is literally that design-system project, and `apps/web` consumes it.

**Fidelity: high (hifi).** Final colors, typography, spacing, radii, shadows, and interactions are decided. Recreate pixel-faithfully using the design tokens below; don't re-invent styling.

## How to consume the design system
- It ships **one stylesheet**: `@spendlio/ui/styles.css` → all CSS custom properties + webfonts. Import once in the web app's root layout.
- Components are token-driven React (`Button`, `Input`, `Card`, `Badge`, `Avatar`, `MoneyAmount`, `TransactionRow`, `CategoryIcon`, `ProgressBar`, `Stat`, `Toast`, `SegmentedControl`, …). Reuse them; don't re-implement.
- **UI kits are layout references**, not shipped code: `ui_kits/mobile` (Login, Home, Activity, Add/Split sheet, Receipt OCR, Recap, Settle, AI chat) and `ui_kits/web` (Overview, Transactions, Budgets, Split, Insights). Compose real components into these layouts.

## Design tokens (summary — full set in `styles.css` / `tokens/`)

**Color**
- Brand green (primary action): `--green-600 #1B6E4F`; deep brand ink `--green-900 #0E3A2B`; scale `--green-50…950`.
- Warm sand accent (sparing): `--sand-500 #BE8A30`.
- Warm neutrals: canvas `--neutral-50 #FAFAF7`, card `#FFFFFF`, ink `--neutral-900 #1E1C17`; scale `--neutral-0…950`.
- Money semantics: positive/income green `--positive-500 #1B7A55`; negative/"you owe" rose `--negative-500 #C24A3E`. Always show **sign + label**, color is reinforcement.
- Data-viz ramp: `--cat-1…8` (green, gold, blue, rose, violet, teal, clay, stone).

**Type**
- Display & figures: **Space Grotesk**; UI/body: **Hanken Grotesk**; ledger detail: **Space Mono**.
- Money uses **tabular lining numerals** (`[data-money]`). Sentence case everywhere; the only uppercase is the letter-spaced eyebrow.

**Shape / depth / motion**
- Radii: pill controls (`--radius-pill`), 22px cards (`--radius-card`), 28px sheets. Soft, warm-tinted shadows (`--shadow-sm` for cards). Motion: short (≈140ms), soft ease-out, no bounce; press scales to 0.97.

**Icons:** Lucide (stroke, ~2px), via CDN in the prototypes; in production install `lucide-react`.

## Voice & copy
Calm, plain-spoken, sentence case, **no emoji**, face-saving around debts. Buttons are verbs ("Add expense", "Settle up", "Split it"). Full guide in the design system's `readme.md` (Content Fundamentals).

## Substitutions to resolve in the real codebase
- **Fonts** are loaded from Google Fonts CDN in the prototypes — self-host the woff2 (or keep the CDN) in production.
- **Icons** are Lucide — keep, or map to the codebase's icon set.
