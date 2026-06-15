# Spendlio — Design System

> Calm, premium personal-finance & expense-splitting. Track what you spend, see where it goes, and split costs with the people in your life — without anyone feeling like they're chasing money.

---

## 1. Product context

**Spendlio** is a personal-finance product that combines everyday money tracking with social expense-splitting. It is built for individuals who also share costs — roommates, couples, travel groups, friends — and want one calm place to see both their own picture and what's owed between people.

Core capabilities (from the product brief):

- **Personal tracking** — expenses, income, recurring transactions
- **Budgets & insights** — monthly summaries, category budgets, trends
- **Splitting** — split a bill with friends, roommates, or a partner; track who owes whom
- **Settle up** — debt tracking and settlement, reminders
- **Receipts** — photo upload, OCR line-item extraction
- **Intelligence** — AI transaction categorization, an AI chat that answers questions about your finances ("how much did I spend on coffee in May?")
- **Notifications** — reminders, settle-up nudges, monthly recaps

The brand voice is **trustworthy without being stiff** — a refined fintech that respects the user's intelligence and the slightly awkward social reality of money between friends.

### Sources

This system was authored **greenfield** — no existing codebase, Figma file, or brand assets were provided. Every token, asset, and component here is original to this build. If Spendlio has existing brand materials (logo files, brand fonts, a real Figma library, a product codebase), share them via the Import menu and this system should be reconciled against them.

**Substitutions to be aware of** (see CAVEATS at the bottom and flagged inline):

- **Fonts** are loaded from **Google Fonts CDN**, not self-hosted. See §4.
- **Icons** use **Lucide** (CDN). See §6.

---

## 2. Brand at a glance

| | |
|---|---|
| **Personality** | Calm · premium · trustworthy · quietly confident |
| **Primary color** | Deep refined green (`--green-600 #1B6E4F`) — money, growth, trust |
| **Accent** | Warm sand / gold (`--sand-500 #BE8A30`) — premium, used sparingly |
| **Canvas** | Warm off-white (`--neutral-50 #FAFAF7`) — light-first |
| **Type** | Space Grotesk (display) · Hanken Grotesk (UI/body) · Space Mono (figures/detail) |
| **Shape** | Soft & rounded — pill controls, 22px cards |
| **Motion** | Short, soft, no bounce |

---

## 3. CONTENT FUNDAMENTALS — how Spendlio writes

**Voice:** a sharp, calm friend who happens to be good with money. Plain-spoken, never preachy, never gamified-cute. We reduce the friction and the awkwardness; we don't celebrate spending or shame it.

**Person & address.** Speak to the user as **"you."** Refer to the product as **"Spendlio"** or **"we"** sparingly (mostly in support/notification contexts). In split contexts, name people directly — "**You owe Maya $24.50**," not "Outstanding balance: $24.50."

**Tone by surface:**
- *Numbers & balances* — neutral and exact. Let the figure do the talking.
- *Empty states* — warm, brief, one clear action. "No expenses yet. Add your first one to get started."
- *Settle-up & debts* — gentle and face-saving. "Maya covered dinner — you owe $24.50." Never "DEBT" in caps, never red alarm language.
- *AI chat* — concise, cites the data. "You spent **$182 on groceries** in May, down 12% from April."
- *Errors* — plain, blameless, actionable. "That receipt didn't scan cleanly. Try a brighter photo, or add the items by hand."

**Casing.** Sentence case **everywhere** — buttons, headers, menu items, titles. ("Add expense," not "Add Expense.") The only all-caps usage is the tiny **eyebrow/overline** label (letter-spaced). Never ALL-CAPS a full sentence.

**Numbers & money.**
- Currency always with symbol and two decimals in detail views (`$24.50`); whole-dollar where space is tight (`$25`).
- Always tabular/lining figures so columns of money align (the system enforces this via `[data-money]`).
- Income/positive uses green; expense/negative uses muted rose — but **lead with the number, color is reinforcement, not the only signal** (accessibility). Prefix sign explicitly: `+$1,200.00`, `−$24.50`.
- Relative dates in lists ("Today," "Yesterday," "Mon"); absolute dates in detail.

**Microcopy patterns:**
- Buttons are **verbs**: "Add expense," "Split it," "Settle up," "Scan receipt," "Remind."
- Confirmations are quiet: a toast — "Expense added," "Reminder sent to Maya."
- Avoid jargon (no "transactions ingested," "reconcile your ledger"). Say "we sorted your spending," "you're all settled."

**Emoji:** **Not used** in the product UI. Category iconography is handled by line icons, not emoji. (Users may type emoji in their own notes/expense titles — that's their content, not ours.)

**Do / Don't**
- ✅ "You're all settled with Maya." ❌ "Congrats! 🎉 Debt cleared!!"
- ✅ "Spent $182 on groceries in May." ❌ "Whoa, big spender — $182 on groceries!"
- ✅ "Split evenly · $12.25 each." ❌ "EQUAL SPLIT APPLIED."

---

## 4. VISUAL FOUNDATIONS

### Color
- **Light-first.** The canvas is a **warm off-white** (`--neutral-50`), never pure white at the page level; cards are pure white (`--neutral-0`) so they lift off the canvas with just a hairline border + whisper shadow.
- **Green is the brand and the primary action.** Deep, desaturated pine/emerald — it reads as money and trust, not lime or mint. One primary green; a 50→950 scale for tints and the dark brand ink (`--green-900`) used for inverse surfaces and headlines on hero panels.
- **Sand/gold is the only secondary accent**, used *sparingly* — premium highlights, the logo's "your share" segment, a featured stat. Never as a button fill for routine actions.
- **Neutrals are warm-tinted greys** (a hint of brown/green), not blue-grey — this keeps the whole UI feeling warm and paper-like rather than clinical-tech.
- **Financial semantics:** positive/income = green; negative/expense & "you owe" = muted **rose** (`--negative-500`, intentionally not a fire-engine red). Sign + label always accompany color.
- **Data-viz** uses an 8-hue categorical ramp (`--cat-1…8`) led by the brand green, then gold, blue, rose, violet, teal, clay, stone — harmonized, mid-saturation, readable on white.
- **No bluish-purple gradients, no neon.** Color is applied in flat fills and tints; gradients appear only as subtle, single-hue depth on hero/balance panels (green-800 → green-900), never decorative rainbow washes.

### Typography
- **Space Grotesk** for display/headings and large figures — geometric, slightly mechanical, gives the brand a confident fintech edge and beautiful numerals.
- **Hanken Grotesk** for all UI and body — a clean humanist-geometric workhorse that stays legible at 13–15px, with the weights (400–800) the UI needs.
- **Space Mono** for account numbers, reference codes, and small "ledger" detail where a monospace texture adds credibility.
- **Sentence case**, tight tracking on display (`-0.015em`), normal on body. The only uppercase is the letter-spaced eyebrow (`--tracking-caps 0.08em`).
- Money figures always use **tabular lining numerals** (enforced globally via `[data-money]` and `.ds-money`).

### Spacing & layout
- **4px base grid.** Component padding lands on 12/16/20/24; section rhythm on 32/48.
- **Generous, calm density** — not cramped, not airy-marketing. Cards breathe (20px pad), lists are scannable (56–64px rows).
- Mobile design width **390px**; web sidebar **256px**, header **64px**, mobile tab bar **72px**.
- Fixed elements: top header (sticky), mobile bottom tab bar (fixed), a floating "Add" affordance on the mobile app.

### Surfaces, borders, radii, shadow
- **Cards:** pure white, **22px radius** (`--radius-card`), hairline `--border-subtle`, `--shadow-sm`. Premium = restraint — most surfaces rely on the border first and shadow second.
- **Controls** (buttons, chips, inputs-as-pills, segmented controls) lean **pill** (`--radius-pill`). Text inputs use a softer **12px** radius.
- **Bottom sheets / modals:** **28px** top radius, `--shadow-xl`.
- Shadows are **soft, low-spread, and warm-tinted** (derived from a warm brown-black, not pure black) so they feel like paper, not plastic.
- Primary CTAs may carry a subtle **brand glow** (`--shadow-brand`) when prominent.

### Motion
- **Calm & premium: short, soft, no bounce.** Entrances use a soft settle ease (`--ease-entrance`), state changes a quick ease-out (`--dur-fast` 140ms).
- **Hover:** background darkens one step (e.g. green-600 → green-700); ghost/neutral elements get a faint tinted wash. No scale-up on hover.
- **Press:** a small **scale to 0.97** (`--press-scale`) + one shade darker. Tactile, brief.
- **Focus:** a 3px soft green ring (`--focus-ring`), never a hard outline.
- Loading uses a gentle shimmer/skeleton; no spinners where a skeleton will do. All motion respects `prefers-reduced-motion`.

### Imagery
- Spendlio is **UI-and-data-led**, not photo-led. Where imagery appears (marketing, onboarding), it skews **warm, natural light, calm** — real objects (receipts, coffee, groceries, a shared table) over abstract finance stock. Avoid cold blue corporate imagery, avoid coins-and-arrows clichés.
- Avatars are circular; user photos or warm tinted initials on the categorical ramp.

### Transparency & blur
- Used **only functionally**: the sticky header gets a translucent canvas with a subtle backdrop blur on scroll; modal scrims are a 45% warm-ink overlay. No frosted-glass-everywhere.

---

## 5. CONTENT — categories & financial language

Default spend categories (each maps to a Lucide icon and a `--cat-*` color): Groceries, Dining, Transport, Housing/Rent, Utilities, Shopping, Health, Entertainment, Travel, Subscriptions, Income, Transfer. Splits reference **groups** (Roommates, Trip to Lisbon, Couple) and **people** (by name + avatar).

---

## 6. ICONOGRAPHY

- **System:** **[Lucide](https://lucide.dev)** — open-source, consistent 1.75–2px stroke, rounded line caps. It matches the geometric-but-warm personality perfectly and covers finance needs (wallet, receipt, arrow-left-right for splits, pie-chart, etc.).
- **Loaded from CDN** (`https://unpkg.com/lucide@latest`) in cards and UI kits; `data-lucide="name"` + `lucide.createIcons()`. **Flagged substitution:** if Spendlio standardizes on a different set later, swap here.
- **Stroke, not fill** is the default. Use `width/height` 18–24, `stroke-width` 2, `color: currentColor` so icons inherit text color.
- **Category & brand glyphs** ride the same Lucide set tinted with the relevant `--cat-*` color inside a soft tinted circle.
- **No emoji** as UI icons. **No unicode** glyph icons. **The only bespoke SVG** is the logomark (`assets/logo-mark.svg` + mono variant) — a "split coin" donut: a coin/donut with one gold segment = your share. Don't redraw it; use the file.

---

## 7. INDEX — what's in this system

**Foundations (root)**
- `styles.css` — global entry point (link this one file). `@import`s everything below.
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `radius.css`, `shadow.css`, `motion.css`, `fonts.css`, `base.css`.
- `assets/` — `logo-mark.svg`, `logo-mark-mono.svg`.

**Design System tab cards**
- `guidelines/*.card.html` — foundation specimens (Type, Colors, Spacing, Brand).

**Components** (`components/`) — see each directory's card:
- `core/` — Button, IconButton, Badge, Tag, Avatar, Card, Divider
- `forms/` — Input, Select, Switch, Checkbox, SegmentedControl, AmountInput
- `data/` — TransactionRow, MoneyAmount, CategoryIcon, ProgressBar, Sparkline, Stat
- `feedback/` — Toast, EmptyState, Skeleton

**UI kits** (`ui_kits/`)
- `mobile/` — Spendlio iOS app: Home/overview, Activity, Split flow, AI chat, Settle-up
- `web/` — Spendlio web dashboard: overview, transactions, budgets, insights

**Skill**
- `SKILL.md` — makes this folder usable as a downloadable Claude Agent Skill.

**Engineering (the product build)**
- `ARCHITECTURE.md` — the system map: monorepo (Next.js + NestJS), shared `contracts`/`core`, database, queue, and how this design system fits in as `packages/ui`.
- `docs/learning/` — a living knowledge base explaining *why* behind every decision (monorepo, contracts, database & money, Drizzle, queues, auth, AI/OCR), an ADR decisions log, and a glossary. Start at `docs/learning/README.md`.
- `contracts/` — draft of `packages/contracts`: the shared domain types (transactions, splits, budgets, receipts, recap) derived from this design system.

---

*Authored greenfield. Pair with real brand assets when available — see §1 Sources and the CAVEATS note at the end of the build.*
