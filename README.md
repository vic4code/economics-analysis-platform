# Global Liquidity Dashboard (MVP)

## Overview
**Global Liquidity Dashboard** is a web application that tracks **global money supply (liquidity), market risk sentiment, and cross‑asset performance**.  
This **MVP** (minimum viable product) focuses on three core indicators to validate the data pipeline and UI:
- **M2 (US Broad Money Supply)** – proxy for overall liquidity (FRED: `M2SL`)
- **VIX (Volatility Index)** – proxy for market risk sentiment
- **S&P 500 Index** – proxy for equity performance

> Goal: provide a simple, reproducible way to observe the relationship between **Liquidity → Sentiment → Assets** and establish a modular foundation for future expansion (rates, FX, commodities, crypto, real estate, global asset structure).

---

## Features
- **ETL (Python)** – fetches time series (FRED + Yahoo Finance) and stores them locally
- **Backend (FastAPI)** – serves normalized time series via `/timeseries` endpoint
- **Frontend (Streamlit)** – interactive charts:
  - *Chart 1*: **M2 YoY%** vs **S&P500** (overlay)
  - *Chart 2*: **VIX** (line)
  - Indicator dropdown & date range control
- **Transforms** – `none | yoy | mom | z` applied on the server
- **Config via .env** – keys and toggles decoupled from code

---

## Architecture
```
[ FRED API / Yahoo Finance ] → [ ETL Job (etl.py) ] → [ SQLite (timeseries.db) ]
                                                        ↓
                                            [ FastAPI Backend (/timeseries) ]
                                                        ↓
                                            [ Streamlit Frontend (app.py) ]
```

### Tech Stack
- **Python 3.10+**
- **FastAPI + Uvicorn** (backend)
- **Streamlit** (frontend)
- **SQLite** (MVP storage; upgrade path: Postgres + TimescaleDB)
- **Pandas / Requests** (ETL & transforms)
- **python-dotenv** (configuration)

---

## Project Structure (suggested)
```
.
├─ app.py               # Streamlit frontend
├─ backend.py           # FastAPI service
├─ etl.py               # ETL job to fetch & load data
├─ requirements.txt     # Python dependencies
├─ .env                 # Environment variables (not committed)
├─ data/
│  └─ timeseries.db     # SQLite database (auto-created by ETL)
└─ README.md
```

---

## Data Sources (MVP)
- **FRED**: M2 – `M2SL`
- **Yahoo Finance** (via yfinance or HTTP): **VIX** (symbol: `^VIX`), **S&P500** (symbol: `^GSPC`)

> Production upgrades: Postgres/TimescaleDB, Redis cache, additional sources (TIC, CFTC, Case‑Shiller, DXY, Gold, BTC/ETH, ETF flows, central bank balance sheets).

---

## Getting Started

### 1) Prerequisites
- Python **3.10+**
- A FRED API key (free): https://fred.stlouisfed.org/docs/api/api_key.html

### 2) Create and activate a virtual environment
```bash
python -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
```

### 3) Install dependencies
```bash
pip install -r requirements.txt
```

### 4) Configure environment variables
Create a `.env` file in the project root:
```bash
FRED_API_KEY=your_fred_api_key
DB_URL=sqlite:///data/timeseries.db   # keep default for MVP
```

### 5) Run ETL (fetch & load data)
```bash
python etl.py
```
This will:
- fetch **M2SL** from FRED, **^VIX** and **^GSPC** from Yahoo Finance
- create `data/timeseries.db` (if not exists)
- upsert the series into a `timeseries` table

### 6) Start the backend (FastAPI)
```bash
uvicorn backend:app --reload
```
API docs available at: `http://127.0.0.1:8000/docs`

### 7) Start the frontend (Streamlit)
```bash
streamlit run app.py
```

---

## API Reference (MVP)

### `GET /timeseries`
Return normalized time series.

**Query Params**
- `code` *(string, required)*: indicator code (e.g., `M2SL`, `^VIX`, `^GSPC`)
- `from` *(YYYY-MM-DD, optional)*
- `to` *(YYYY-MM-DD, optional)*
- `transform` *(enum, optional)*: `none | yoy | mom | z`

**Example**
```
GET /timeseries?code=M2SL&from=2010-01-01&transform=yoy
```

**Response**
```json
{
  "code": "M2SL",
  "transform": "yoy",
  "points": [
    { "ts": "2010-01-01", "v": 1.9 },
    { "ts": "2010-02-01", "v": 2.1 }
  ],
  "meta": { "freq": "M", "source": "FRED", "unit": "pct_yoy" }
}
```

---

## Data Model (SQLite MVP)

**Table: `timeseries`**
| column          | type      | note                                 |
|-----------------|-----------|--------------------------------------|
| id              | INTEGER PK| autoincrement                        |
| indicator_code  | TEXT      | e.g., `M2SL`, `^VIX`, `^GSPC`        |
| ts_date         | DATE      | timestamp                            |
| value           | REAL      | numeric value                        |
| freq            | TEXT      | `D`/`W`/`M`                          |
| source          | TEXT      | `FRED`/`YF`                          |
| unit            | TEXT      | e.g., `level`, `index`, `pct`        |
| sa              | INTEGER   | 1/0, seasonally adjusted flag        |
| created_at      | DATETIME  | insert time                          |
| updated_at      | DATETIME  | last update                          |

**Unique index**: `(indicator_code, ts_date)`

---

## Frontend (Streamlit) MVP
- Sidebar:
  - Indicator selector (`M2SL`, `^GSPC`, `^VIX`)
  - Date range
  - Transform switch (`none`, `yoy`, `mom`, `z`)
- Charts:
  - **M2 YoY% vs S&P 500 overlay**
  - **VIX** line chart
- Notes:
  - Show last update time & source
  - Display data availability window

---

## Development & Scripts
- **Lint/format**: recommend `ruff` + `black`
- **Testing**: `pytest` (unit tests for ETL, transforms, API)
- **Makefile** (optional):
  ```makefile
  etl:        ## run ETL
	python etl.py
  api:        ## run API
	uvicorn backend:app --reload
  ui:         ## run Streamlit
	streamlit run app.py
  ```

---

## Roadmap
- Add **US yield curve** (2Y/10Y, `T10Y2Y`), **DXY**, **Gold**, **BTC/ETH**
- Add **ETF flows**, **CFTC COT**, **TIC**, **Case‑Shiller**, **Mortgage rates**
- Implement **GLI‑lite** (composite of major CB balance sheets + M2 YoY; minus RRP/TGA when available)
- Migrate to **Postgres + TimescaleDB**, add **Redis** cache
- Add **Backtesting module** (liquidity/risk regimes → allocation rules)
- Add **Docker Compose** & **CI/CD (GitHub Actions)**

---

## Notes & Disclaimers
- This MVP is for **research/education**. Data may be delayed or revised by providers.
- Be mindful of **rate limits** and **terms of use** for each data source.
- Do not commit secrets; use `.env` and a secrets manager in production.

---

## License
MIT License
