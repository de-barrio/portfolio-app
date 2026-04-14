# Portfolio Research Simulator - Build Resume File

## Status: ALL 13 PHASES FULLY COMPLETE, build passing

Last updated: 2026-04-14
Last successful build: `npx next build` passes clean (all routes compile)

## What's Done (Phases 0-12)

### Phase 0: Scaffolding ✅
- Next.js 16 + TypeScript + Tailwind v4 + App Router + src directory
- shadcn/ui components installed: button, card, input, dialog, badge, tooltip, select, tabs, command, sheet, separator, skeleton, table, dropdown-menu
- Fonts: Playfair Display + Inter via next/font/google
- Design system colors in `src/app/globals.css` (warm palette from design-system.md)
- Root layout with ThemeProvider, TooltipProvider, Toaster, AppShell sidebar
- Formatting helpers in `src/lib/format.ts` (usd, pct, sign, f1, f2)
- Constants in `src/lib/constants.ts` (CHART_COLORS, MOCK_PRICES, INTENT_TAGS)

### Phase 1: Database ✅
- Prisma v7 + SQLite with 12 tables (schema in `prisma/schema.prisma`)
- Tables: portfolios, portfolio_drafts, portfolio_draft_positions, portfolio_versions, portfolio_version_positions, assets, asset_quotes, asset_daily_history, watchlist_items, research_notes, research_runs, settings
- **IMPORTANT Prisma v7 quirk**: Uses `@prisma/adapter-better-sqlite3` adapter pattern. PrismaClient requires `{ adapter }` constructor arg. See `src/lib/db.ts` and `prisma/seed.ts`.
- Seed script populates 45 assets with mock quotes, 3 sample portfolios (Core Growth, Defensive Income, Trade Ideas), default settings
- Run seed: `npx tsx prisma/seed.ts`
- DATABASE_URL in `.env`: `file:./prisma/dev.db`

### Phase 2: Market Data ✅
- Provider interface: `src/lib/market-data/types.ts`
- Mock provider with 45 tickers: `src/lib/market-data/mock-provider.ts`
- Cache layer (5min TTL): `src/lib/market-data/index.ts`
- API routes: `/api/assets/search`, `/api/assets/[symbol]`, `/api/assets/[symbol]/history`

### Phase 3: Dashboard ✅
- Route: `/` (src/app/page.tsx)
- Portfolio cards grid with name, tag badge, value, return %, position count
- Create/duplicate/delete portfolios
- SWR hooks in `src/lib/hooks.ts`

### Phase 4: Portfolio Workspace ✅
- Route: `/portfolios/[id]` (src/app/portfolios/[id]/page.tsx)
- Holdings table with editable shares and target %, price badges
- Add position via search dialog (cmdk)
- DonutChart component (ported from prototype SVG): `src/components/portfolio/donut-chart.tsx`
- StatCard component: `src/components/portfolio/stat-card.tsx`
- Target vs Actual drift bars panel
- Draft auto-save (800ms debounce)
- API routes: GET/PATCH `/api/portfolios/[id]/draft`

### Phase 5: Save Version ✅
- Save version dialog in workspace page
- POST `/api/portfolios/[id]/save-version`: atomic transaction, locks prices, creates immutable version
- No PATCH/DELETE routes for versions (immutability enforced at API layer)

### Phase 6: Version Timeline + Detail ✅
- Timeline: `/portfolios/[id]/versions`
- Detail: `/portfolios/[id]/versions/[versionId]`
- Read-only holdings table with lock icons on baseline prices
- Analytics engine: `src/lib/analytics/` (returns.ts, risk.ts, benchmark.ts)
- API: GET `/api/versions/[id]`

### Phase 7: Compare ✅
- Route: `/compare`
- Select portfolio → version A vs version B
- Side-by-side stats, holdings diff (added/removed/changed)

### Phase 8: Watchlist ✅
- Route: `/watchlist`
- Add/remove assets, inline note editing, price + day change display
- API: GET/POST `/api/watchlist`, PATCH/DELETE `/api/watchlist/[id]`

### Phase 9: Research ✅
- Route: `/research`
- 6 commands: analyze-portfolio, research-company, research-fund, compare-versions, benchmark-review, recommendation-mode
- Prompt templates with non-advisory preamble: `src/lib/research/prompts/index.ts`
- Falls back to mock response if no ANTHROPIC_API_KEY
- Run history display
- API: POST/GET `/api/research`

### Phase 10: Notes ✅
- Route: `/notes`
- Search, create, delete notes
- API: GET/POST `/api/notes`

### Phase 11: Settings ✅
- Route: `/settings`
- Risk-free rate, default benchmark, currency, date format, refresh interval
- API: GET/PUT `/api/settings`

### Phase 12: Polish ✅
- Dark mode CSS variables defined in globals.css
- ThemeProvider with next-themes wired up
- Dark mode toggle button in sidebar footer (Sun/Moon icon)
- Loading skeletons on all pages (dashboard, workspace, versions, watchlist, settings, notes)
- Toast notifications on all mutations (sonner)
- Custom scrollbars, tabular-nums utility, fade-in animation
- Error boundaries (`error.tsx`) on all route segments (root, compare, watchlist, research, notes, settings, portfolios/[id])
- Shared `ErrorFallback` component: `src/components/error-fallback.tsx`
- Global command palette (Cmd+K): `src/components/command-palette.tsx` — navigation + actions
- Cmd+S keyboard shortcut in workspace to open Save Version dialog
- CSV/JSON export buttons on version detail page (`/portfolios/[id]/versions/[versionId]`)

## Key Architecture Notes

- **Next.js 16 breaking changes**: `params` and `searchParams` are `Promise<T>` and must be `await`ed in route handlers and `use()`d in client components
- **Prisma v7**: No `datasourceUrl` in schema; uses adapter pattern. Import from `../generated/prisma/client` not `@prisma/client`
- **shadcn/ui v4 (base-ui)**: `Select.onValueChange` passes `string | null`, need `(v) => setter(v ?? "")` wrapper. No `asChild` prop on triggers.
- **All data flows through API routes** - client never talks to DB or market data directly
- **Version immutability**: enforced at API layer (no update/delete endpoints for version tables)

## File Structure
```
src/
├── app/
│   ├── api/
│   │   ├── assets/search/route.ts, [symbol]/route.ts, [symbol]/history/route.ts
│   │   ├── portfolios/route.ts, [id]/route.ts, [id]/draft/route.ts, [id]/save-version/route.ts, [id]/versions/route.ts
│   │   ├── versions/[id]/route.ts
│   │   ├── watchlist/route.ts, [id]/route.ts
│   │   ├── notes/route.ts
│   │   ├── research/route.ts
│   │   └── settings/route.ts
│   ├── portfolios/[id]/page.tsx, versions/page.tsx, versions/[versionId]/page.tsx
│   ├── compare/page.tsx
│   ├── watchlist/page.tsx
│   ├── research/page.tsx
│   ├── notes/page.tsx
│   ├── settings/page.tsx
│   ├── page.tsx (dashboard)
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/ (shadcn components)
│   ├── portfolio/donut-chart.tsx, stat-card.tsx
│   ├── app-shell.tsx (sidebar nav + dark mode toggle)
│   ├── command-palette.tsx (Cmd+K global command palette)
│   ├── error-fallback.tsx (shared error boundary UI)
│   └── theme-provider.tsx
├── lib/
│   ├── market-data/types.ts, mock-provider.ts, index.ts
│   ├── analytics/returns.ts, risk.ts, benchmark.ts, index.ts
│   ├── research/prompts/index.ts
│   ├── constants.ts, format.ts, hooks.ts, db.ts, utils.ts
│   └── generated/prisma/ (auto-generated)
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── dev.db
```

## Commands
```bash
npm run dev          # Start dev server
npx next build       # Production build
npx tsx prisma/seed.ts  # Re-seed database
npx prisma studio    # Visual DB browser
npx prisma migrate dev --name <name>  # New migration
```
