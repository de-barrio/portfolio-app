@AGENTS.md

# Portfolio App — Session Context

## Tech Stack
- Next.js 16.2.3 (Turbopack, App Router)
- Prisma (SQLite via Turso)
- Yahoo Finance for market data (via `src/lib/market-data/`)
- SWR for client data fetching (`src/lib/hooks.ts`)
- Tailwind CSS + shadcn/ui components
- Default branch: `master`

## Key Architecture
- **Portfolios** have a mutable **Draft** (working copy) and immutable **Versions** (snapshots)
- Draft API (`/api/portfolios/[id]/draft`) enriches positions with live quotes and baseline data
- Format helpers in `src/lib/format.ts`: `usd`, `pct`, `sign`, `signUsd`, `compactUsd`, `f1`, `f2`
- App shell with sidebar nav in `src/components/app-shell.tsx`

## Recently Implemented (April 2026)

### PR #4: Performance Tracking, Allocation Warnings & Cash Bar
**Files:** `src/lib/format.ts`, `src/app/api/portfolios/[id]/draft/route.ts`, `src/app/portfolios/[id]/page.tsx`

- `signUsd()` formatter for signed dollar amounts (+$1,234.56)
- Draft GET API returns `change`, `changePercent`, `baselinePrice` per position, plus `totalDayChange`, `totalDayChangePct`, `baselineTotal`, `latestVersionNumber`
- Baseline prices fetched from latest saved PortfolioVersion via Prisma
- Portfolio detail page: 6 stat cards (Market Value, Cash, Day's Change, Since Save, Positions, Target Coverage)
- Two new table columns: Day Chg and Since Save with green/red coloring
- Over-allocation warning banner (amber <10%, red >10% of baseCapital)
- Cash stat card goes red when over-allocated
- Sticky available-cash progress bar (green → amber at 90% → red when over, "OVER" badge)
- Saving still works when over-allocated (non-blocking)

### PR #5: Sidebar Logo Navigation
**File:** `src/components/app-shell.tsx`

- Sidebar "P" logo wrapped in `<Link href="/">` for homepage navigation

### Compare Page: Fix Display Names + Portfolio vs Portfolio Mode
**File:** `src/app/compare/page.tsx`

- Fixed select dropdowns showing raw UUIDs — now resolve human-readable names via lookup helpers (`resolvePortfolioName`, `resolveVersionName`)
- Replaced `<SelectValue>` with custom `<span>` renders in all `<SelectTrigger>` elements
- Added Versions/Portfolios mode toggle using `<Tabs>` component
- **Versions mode** (existing): pick one portfolio, two versions to compare
- **Portfolios mode** (new): pick two portfolios, compare live draft data side by side
- Portfolios mode fetches from `/api/portfolios/[id]/draft` and shows market value, base capital, day's change, positions count
- Holdings diff reused across both modes via shared `HoldingsDiff` component
- Extracted sub-components: `VersionStatsCard`, `DraftStatsCard`, `StatRow`, `HoldingsDiff`, `EmptyState`
- Switching modes resets all selections
- Page title/subtitle updates dynamically based on active mode

## Edge Cases Handled
- No saved version → "Since Save" shows "---" / "No saved version"
- Position added after last save → baseline is null, shows "---"
- Market closed (change = 0) → neutral color
- Empty portfolio → empty state spans all 9 columns
