# 06 · The web app — Next.js

> Grows as we build. Core ideas and the design-system link are set here.

## Why Next.js (App Router)

React framework with server-side rendering, file-based routing, and **React Server Components (RSC)**. Finance dashboards are data-heavy; rendering on the server keeps the client light and the first paint fast, and keeps secrets (DB/API tokens) off the browser.

## Server vs client components — the one concept to internalize

- **Server Components (default):** run on the server, can fetch data directly, send only HTML/data to the browser. Use for pages, lists, anything read-mostly. No JS shipped for them.
- **Client Components (`'use client'`):** run in the browser, can use state/effects/handlers. Use for interactive bits — the Add-expense sheet, the segmented control, the AI chat box.

Rule of thumb: **server by default; reach for `'use client'` only when you need interactivity.** Most of the dashboard is server-rendered; the islands of interaction are client components.

## Consuming the design system

`apps/web` depends on **`@spendlio/ui`** (this project):
- import `@spendlio/ui/styles.css` once in the root layout → all tokens + fonts.
- import components: `import { Button, TransactionRow, MoneyAmount } from '@spendlio/ui'`.
- The components are already token-driven, so theming is automatic.

The web **UI kit** in `ui_kits/web/` is the visual reference for layout (sidebar, topbar, overview, tables) — production pages compose the real components into those layouts.

## Data flow

```
Server Component  ──fetch──▶  API (or directly: server action)  ──▶  contracts-typed data  ──▶  render
Client Component  ──mutation (server action / fetch)──▶ API ──▶ revalidate
```

- Reads: server components fetch typed data (shapes from `contracts`).
- Writes: **server actions** (or API calls) validated by the same `contracts` schema the form uses.
- After a write, revalidate the affected data so the UI updates.

## ⬜ To decide / document as we build
- Data layer: server actions hitting the API vs. a typed client (React Query / tRPC).
- Auth integration on the web (sessions) — see [`08-auth-security.md`](./08-auth-security.md).
- Charts: the UI kit uses CSS-only (div bars + conic-gradient donut). For richer charts, pick a lib (e.g. visx/Recharts) — logged in `decisions.md`.
