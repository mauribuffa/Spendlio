# Spendlio — Mobile app UI kit

A high-fidelity, click-through recreation of the Spendlio iOS app, composed from the design-system components.

Open **`index.html`** to interact: switch tabs, tap **+** to open the Add-expense / split sheet, save to see the toast, and try the AI Assistant tab (tap a suggested prompt).

## Screens
| File | Screen |
|---|---|
| `AuthScreen.jsx` | Login / sign-up gate — email + password, social, magic-link feel |
| `HomeScreen.jsx` | Overview — balance hero, recap banner, budgets, settle snapshot, recent activity |
| `ActivityScreen.jsx` | Transaction list — search, category filter chips, day groups |
| `AddExpenseSheet.jsx` | Add expense + split bottom sheet — amount, category, split modes, people |
| `ReceiptScanSheet.jsx` | Receipt scan + OCR — parsed line items, AI categorization, confidence |
| `MonthlyRecapSheet.jsx` | Monthly recap — spend hero, stats, top categories, AI highlight |
| `SettleScreen.jsx` | Split & settle — groups, per-person balances |
| `ChatScreen.jsx` | AI financial assistant — chat with data breakdowns |
| `App.jsx` | Shell — auth gate, tab bar, center FAB, routing, sheets, toast |
| `ui.jsx` | Shared chrome — `ScreenHeader`, `SectionHeader`, `ScreenScroll`, `Sheet` |
| `data.js` | Mock data (people, activity, budgets, balances, groups) |
| `ios-frame.jsx` | iOS device bezel (starter component) |

Flow: opens on **Login** → tap **Log in** to enter. From Home, the **scan** icon or the Add sheet's "Scan a receipt" opens OCR; the **recap banner** opens the monthly recap.

## How it loads
`index.html` loads, in order: the DS bundle (`_ds_bundle.js`) → device frame → data → shared UI → screens → shell. Components come from `window.SpendlioDesignSystem_5a5954`; icons from Lucide (CDN). Screens attach themselves to `window`.

These are cosmetic recreations — interactions are faked. Real categorization, OCR, and AI are out of scope.
