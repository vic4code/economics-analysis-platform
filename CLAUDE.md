# Fund Flow Dashboard — Project Guide

## Contributing rules

- **All PR titles, bodies, and commit messages must be written in English.** No Chinese in any GitHub-facing text (titles, descriptions, review comments). Chinese is only allowed in code comments and chat.

## Overview

A single-page global capital flow analysis platform with 6 tabs: Macro Flow, Overview, Trend Analysis, Backtest, Flow & Chips, Events & Cycles. All market data is simulated (mock) using a deterministic seeded PRNG so results are reproducible within a trading day.

## Architecture

### Dual-mode deployment

| Mode | How | Data source |
|------|-----|-------------|
| Local dev | `python serve.py` | `data_engine.py` via HTTP API |
| GitHub Pages | Static files | `data.js` (JS port of data_engine) |

`index.html` detects the mode via `IS_STATIC = !['localhost','127.0.0.1'].includes(location.hostname)` and routes all API calls through `apiFetch()`, which delegates to either `fetch()` or `window.API_IMPL.handleLocal()`.

### File layout

```
serve.py          – Thin HTTP layer: routes only, no business logic
data_engine.py    – All mock data generation (Python)
data.js           – JavaScript port of data_engine (GitHub Pages fallback)
index.html        – HTML shell + all frontend JS (single-file SPA)
style.css         – Dark-theme styles with CSS custom properties (:root)
chart.umd.min.js  – Bundled Chart.js (offline-capable)
```

### Key invariants

- **Seeded PRNG**: prices are generated daily with `seed_for(symbol)`, anchored to `time() // 86400`, so the same symbol always produces the same series within a calendar day. Both Python and JS must use the same seed formula.
- **ETF_UNIVERSE / SECTOR_DRIFT**: defined in `data_engine.py` **and** mirrored in `data.js`. If you add an ETF, update both files.
- **SECTOR_COLORS**: canonical map lives in `index.html` (`const SECTOR_COLORS = {...}`). `data.js` has its own `SECTOR_COLORS_MAP` for cycle-data coloring. Keep them in sync.
- **MOCK_EVENTS**: 16 fixed historical events defined in `data_engine.py` **and** mirrored in `data.js`. The list must be identical in both files.
- **`calcStats()`**: the shared stats helper (return, CAGR, Sharpe, max-drawdown) lives at the top of the `data.js` IIFE and as `compute_stats()` in `data_engine.py`. Both use 252 trading days/year.

## Running locally

```bash
# Install deps (only needed once)
pip install -r requirements.txt   # currently stdlib only; no extra deps

# Start the dev server
python serve.py                   # → http://localhost:8000

# Optional flags
python serve.py --port 9000 --host 127.0.0.1
```

## Data engine

`data_engine.py` exports these public functions (all imported by `serve.py`):

| Function | Description |
|----------|-------------|
| `get_all_quotes()` | Current quote snapshot for all 31 ETFs (60s TTL cache via `QuoteCache`) |
| `generate_series(symbol, days)` | OHLCV daily series for one ETF |
| `get_macro_data(period)` | Recursive capital hierarchy tree with AUM + period change |
| `run_backtest(weights, period)` | Portfolio vs SPY backtest |
| `run_strategy_backtest(period, top_n)` | Momentum rotation vs equal-weight vs SPY |
| `get_chips_data(period)` | Simulated institutional / smart-money / retail net-buy per sector |
| `get_flow_matrix(period)` | Flow scores, volume ratios, pairwise rotation matrix |
| `get_cycle_data()` | Monthly return history + percentile rank per sector |
| `compute_stats(vals)` | Shared: total return, CAGR, Sharpe, max-drawdown |

## Frontend state

All mutable frontend state is in `let state = { ... }` in `index.html`. DOM refs that are accessed on every render or in event handlers are cached at the top of the script as `const _loader`, `_tabBtns`, `_periodBtns`, etc. — do not use `document.getElementById` repeatedly in hot paths.

## Adding a new API endpoint

1. Add a generator function to `data_engine.py`
2. Add the route in `serve.py → _Handler._handle_api()`
3. Add a JS port function to `data.js`
4. Add the route to `data.js → handleLocal()`
5. Export the function in `window.API_IMPL`

## Adding a new ETF

1. Add to `ETF_UNIVERSE` in `data_engine.py` (with name, sector, base, vol, mcap)
2. Mirror the entry in `data.js → ETF_UNIVERSE`
3. If it introduces a new sector, add the drift to `SECTOR_DRIFT` in both files and a colour to `SECTOR_COLORS` in `index.html` and `SECTOR_COLORS_MAP` in `data.js`

## Deployment (GitHub Pages)

The `gh-pages` branch serves the static version. Push changes there after testing locally:

```bash
git checkout gh-pages
git merge main   # or cherry-pick specific commits
git push origin gh-pages
```

No build step required — all assets are vanilla HTML/CSS/JS.
