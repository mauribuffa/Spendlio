# Spendlio — Web dashboard UI kit

A high-fidelity, click-through recreation of the Spendlio web app, composed from the design-system components and shown inside a browser frame.

Open **`index.html`** and use the left sidebar to move between views.

Styled to match the iOS app's visual language — warm canvas, the dark-green balance hero, recap banner, rounded-2xl cards — in a desktop sidebar layout.

## Views & flow
| File | View |
|---|---|
| `Onboarding.jsx` | Pre-app flow — welcome → base currency → language (`WebOnboarding`) + `WebLogin` |
| `Overview.jsx` | Dashboard — green balance hero, May-recap banner, spending chart, category donut, recent transactions, settle-up |
| `Transactions.jsx` | Full transactions table — filter chips, status badges |
| `Accounts.jsx` | Multi-currency "bank tabs" — All (converted total) + per-currency (exact) |
| `Budgets.jsx` | Budget summary + per-category budget cards |
| `Split.jsx` | Groups + per-person balances with settle/remind actions |
| `Assistant.jsx` | AI chat over your data, with category breakdowns |
| `Settings.jsx` | Profile + preferences (currency/language/timezone), notifications, security |
| `Modals.jsx` | `WebAddExpenseModal` (amount/category/split) + `WebReceiptScanModal` (OCR) |
| `app.jsx` | Shell — pre-app flow, sidebar, topbar, routing, recap modal, toast, Insights |
| `ui.jsx` | Shared chrome — `Sidebar`, `Topbar`, `Modal`, `Donut` (conic-gradient), `BarChart` |
| `data.js` | Mock data (months, categories, budgets, transactions, people, accounts, fx, recap) |
| `browser-window.jsx` | Browser chrome (starter component) |

Flow: opens on **onboarding** → "Get started" (or "I already have an account" → login) → dashboard. Topbar **Add expense** / **Scan** open modals; the Overview recap banner opens the recap modal; the sidebar avatar opens Settings.

## How it loads
`index.html` loads the DS bundle (`_ds_bundle.js`) → browser frame → data → shared UI → views → shell. Components come from `window.SpendlioDesignSystem_5a5954`; icons from Lucide (CDN). Charts are CSS-only (div bars + `conic-gradient` donut) — no charting library.

Cosmetic recreation; interactions are faked.
