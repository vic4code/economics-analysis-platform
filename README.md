# Fund Flow Dashboard

A single-page global capital flow analysis platform built with Next.js. All market data is simulated using a deterministic seeded PRNG — results are fully reproducible within a calendar day.

**Live:** [fund-flow-dashboard.vercel.app](https://fund-flow-dashboard.vercel.app) · deployed automatically on every merge to `main`

---

## Features

| Tab | Description |
|-----|-------------|
| **Macro Flow** | Recursive capital hierarchy tree — equities → sectors → ETFs with AUM and period change |
| **Overview** | Quote grid for all 31 ETFs with sortable columns and sparklines |
| **Trend Analysis** | Multi-symbol candlestick / line overlay with event annotations |
| **Backtest** | Portfolio vs SPY backtest with custom weights; momentum rotation strategy |
| **Flow & Chips** | Sankey capital rotation diagram, quadrant bubble chart, institutional chip tracker |
| **Events & Cycles** | Economic cycle rotation clock, event timeline, sector heatmap, 52-week percentile ranks |

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | CSS custom properties + Tailwind utilities |
| Charts | Chart.js 4 (via react-chartjs-2) + custom SVG components |
| Data | Deterministic mock engine (`src/lib/data-engine/`) |
| Deployment | Vercel (Singapore region) |
| CI | GitHub Actions — build check + Vercel deploy on every PR and push to `main` |

---

## Project structure

```
.
├── .claude/                    # Claude Code settings
├── .github/workflows/          # CI: build check + Vercel deploy
├── src/
│   ├── app/
│   │   ├── api/                # Next.js route handlers (one per data function)
│   │   ├── globals.css         # Dark-theme design system (CSS custom properties)
│   │   ├── layout.tsx
│   │   └── page.tsx            # Root SPA shell — fetches data, owns tab state
│   ├── components/
│   │   ├── charts/             # Reusable chart primitives (Sankey, RotationClock, …)
│   │   ├── layout/             # TopBar, TabNav, Loader
│   │   └── tabs/               # One component per tab
│   ├── lib/
│   │   ├── data-engine/        # All mock data generation (TypeScript port)
│   │   └── utils/              # Color helpers, formatters
│   └── types/                  # Shared TypeScript interfaces
├── tests/                      # Unit tests (jest — run separately)
│   ├── components/charts/
│   └── lib/data-engine/
├── vercel.json                 # Vercel project config
├── next.config.ts
└── tailwind.config.ts
```

> **Legacy files** (`index.html`, `style.css`, `data.js`, `data_engine.py`, `serve.py`) are kept for historical reference but are no longer part of the active deployment.

---

## Local development

```bash
# Install dependencies (first time only)
npm install

# Start the dev server
npm run dev          # → http://localhost:3000

# Type check
npm run type-check

# Production build
npm run build
```

---

## Data engine

All data is generated client-side (API routes call `src/lib/data-engine/`). The engine uses a seeded PRNG anchored to `floor(Date.now() / 86400000)` so every symbol produces the same series within a calendar day.

| Module | Description |
|--------|-------------|
| `quotes.ts` | Current quote snapshot for all 31 ETFs (60 s TTL) |
| `series.ts` | OHLCV daily series for one ETF |
| `macro.ts` | Recursive capital hierarchy tree |
| `backtest.ts` | Portfolio vs SPY backtest |
| `chips.ts` | Institutional / smart-money / retail net-buy + flow matrix |
| `cycle.ts` | Monthly return history + percentile rank per sector |
| `stats.ts` | Shared: total return, CAGR, Sharpe, max-drawdown (252 days/year) |
| `prng.ts` | Seeded PRNG — `SeededRandom` + `seedFor(symbol)` |
| `constants.ts` | `ETF_UNIVERSE`, `SECTOR_DRIFT`, `MOCK_EVENTS`, `MACRO_TREE` |

---

## Adding a new API endpoint

1. Add a generator function to `src/lib/data-engine/`
2. Re-export it from `src/lib/data-engine/index.ts`
3. Create `src/app/api/<name>/route.ts` calling the function
4. Consume via `fetch('/api/<name>')` in the relevant tab component

## Adding a new ETF

1. Add an entry to `ETF_UNIVERSE` in `src/lib/data-engine/constants.ts`
2. If it introduces a new sector, add the drift to `SECTOR_DRIFT` and a colour to `SECTOR_COLORS` in `src/lib/utils/colors.ts`

---

## Deployment

Every push to `main` triggers a Vercel production deploy via `.github/workflows/vercel.yml`. Every PR gets an isolated preview deployment with a unique URL posted as a PR comment.

Required repository secret: `VERCEL_TOKEN`
