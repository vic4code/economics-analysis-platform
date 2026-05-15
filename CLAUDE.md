# Fund Flow Dashboard — Project Guide

## Contributing rules

- **All PR titles, bodies, and commit messages must be written in English.** No Chinese in any GitHub-facing text (titles, descriptions, review comments). Chinese is only allowed in code comments and chat.

## Overview

A single-page global capital flow analysis platform with 6 tabs: Macro Flow, Overview, Trend Analysis, Backtest, Flow & Chips, Events & Cycles. All market data is simulated (mock) using a deterministic seeded PRNG so results are reproducible within a trading day.

**Stack**: Next.js 15 · TypeScript · Chart.js 4 · Tailwind · Vercel

## Architecture

```
src/
├── app/
│   ├── api/              – Next.js route handlers (thin wrappers around data-engine)
│   ├── globals.css       – Dark-theme design system (CSS custom properties)
│   └── page.tsx          – Root SPA shell; owns tab + period state; fetches on mount
├── components/
│   ├── charts/           – Reusable SVG/canvas chart primitives (Sankey, RotationClock, …)
│   ├── layout/           – TopBar, TabNav, Loader
│   └── tabs/             – One component per tab
├── lib/
│   ├── data-engine/      – All mock data generation (TypeScript)
│   └── utils/            – Color helpers, formatters
└── types/                – Shared TypeScript interfaces
tests/                    – Unit tests (jest); tsconfig in tests/tsconfig.json
```

## Running locally

```bash
npm install       # first time only
npm run dev       # → http://localhost:3000
npm run type-check
npm run build
```

## Data engine

All data is generated server-side in `src/lib/data-engine/` and exposed through `src/app/api/` route handlers.

| Module | Description |
|--------|-------------|
| `quotes.ts` | Current quote snapshot for all 31 ETFs (60 s TTL) |
| `series.ts` | OHLCV daily series for one ETF |
| `macro.ts` | Recursive capital hierarchy tree with AUM + period change |
| `backtest.ts` | Portfolio vs SPY backtest; momentum rotation strategy |
| `chips.ts` | Institutional / smart-money / retail net-buy per sector + flow matrix |
| `cycle.ts` | Monthly return history + percentile rank per sector |
| `stats.ts` | Shared: total return, CAGR, Sharpe, max-drawdown (252 days/year) |
| `prng.ts` | Seeded PRNG — `SeededRandom` + `seedFor(symbol)` |
| `constants.ts` | `ETF_UNIVERSE`, `SECTOR_DRIFT`, `MOCK_EVENTS`, `MACRO_TREE` |

### Key invariants

- **Seeded PRNG**: seed = `floor(Date.now() / 86400000) + charCodeSum(symbol)` — same symbol produces the same series within a calendar day.
- **ETF_UNIVERSE / SECTOR_DRIFT / SECTOR_COLORS**: all defined in `constants.ts` and `src/lib/utils/colors.ts`. Update only those files.
- **MOCK_EVENTS**: 16 fixed historical events in `constants.ts`. Do not duplicate into any other file.
- **`computeStats()`**: lives in `stats.ts`; uses 252 trading days/year.

## Adding a new API endpoint

1. Add a generator function to `src/lib/data-engine/`
2. Re-export it from `src/lib/data-engine/index.ts`
3. Create `src/app/api/<name>/route.ts` calling the function
4. Consume via `fetch('/api/<name>')` in the relevant tab component

## Adding a new ETF

1. Add to `ETF_UNIVERSE` in `src/lib/data-engine/constants.ts`
2. If it introduces a new sector, add the drift to `SECTOR_DRIFT` and a colour to `SECTOR_COLORS` in `src/lib/utils/colors.ts`

## Deployment

Every push to `main` → Vercel production deploy (auto, via GitHub Actions).
Every PR → isolated Vercel preview deploy with URL posted as a PR comment.

Required secret: `VERCEL_TOKEN` (repository → Settings → Secrets).
