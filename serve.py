#!/usr/bin/env python3
"""Fund Flow Dashboard – dev server + market-data API (mock data).

Routes
------
GET /api/quotes             – current quotes for all ETFs
GET /api/history            – ?symbol=XLK&period=1y
GET /api/sectors            – sector-level aggregated performance
GET /api/backtest           – ?weights=XLK:30,SMH:20&period=3y
GET /api/macro              – ?period=1d  global capital hierarchy with AUM + changes
GET /api/strategy-backtest  – ?period=1y  momentum vs equal-weight vs SPY
Everything else is served as a static file.
"""

from __future__ import annotations

import argparse
import http.server
import json
import math
import random
import socket
import sys
import time
import urllib.parse
from datetime import datetime, timedelta
from functools import partial
from pathlib import Path

# ---------------------------------------------------------------------------
# ETF universe  (symbol → metadata + simulation params)
# ---------------------------------------------------------------------------

ETF_UNIVERSE: dict[str, dict] = {
    # Crypto
    "IBIT":  {"name": "iShares Bitcoin Trust",     "sector": "Crypto",        "base": 55.40,  "vol": 0.045, "mcap": 38},
    "BITO":  {"name": "ProShares Bitcoin ETF",     "sector": "Crypto",        "base": 28.15,  "vol": 0.042, "mcap": 12},
    # Technology
    "QQQ":   {"name": "Nasdaq 100",                "sector": "Technology",    "base": 484.50, "vol": 0.015, "mcap": 280},
    "XLK":   {"name": "Technology Select SPDR",    "sector": "Technology",    "base": 215.30, "vol": 0.014, "mcap": 68},
    "SMH":   {"name": "VanEck Semiconductor",      "sector": "Technology",    "base": 218.40, "vol": 0.020, "mcap": 22},
    "ARKK":  {"name": "ARK Innovation",            "sector": "Technology",    "base": 55.80,  "vol": 0.030, "mcap": 8},
    # Real Estate
    "VNQ":   {"name": "Vanguard Real Estate",      "sector": "Real Estate",   "base": 84.20,  "vol": 0.012, "mcap": 34},
    "IYR":   {"name": "iShares Real Estate",       "sector": "Real Estate",   "base": 87.50,  "vol": 0.012, "mcap": 28},
    # Energy
    "XLE":   {"name": "Energy Select SPDR",        "sector": "Energy",        "base": 91.80,  "vol": 0.018, "mcap": 38},
    "XOP":   {"name": "Oil & Gas E&P SPDR",        "sector": "Energy",        "base": 147.60, "vol": 0.022, "mcap": 4},
    # Healthcare
    "XLV":   {"name": "Healthcare Select SPDR",    "sector": "Healthcare",    "base": 148.20, "vol": 0.010, "mcap": 38},
    "IBB":   {"name": "iShares Biotech",           "sector": "Healthcare",    "base": 137.80, "vol": 0.018, "mcap": 8},
    # Financials
    "XLF":   {"name": "Financials Select SPDR",    "sector": "Financials",    "base": 45.20,  "vol": 0.013, "mcap": 42},
    "KBE":   {"name": "SPDR S&P Bank ETF",         "sector": "Financials",    "base": 47.90,  "vol": 0.016, "mcap": 2},
    # Consumer
    "XLY":   {"name": "Consumer Discret. SPDR",    "sector": "Consumer",      "base": 194.60, "vol": 0.014, "mcap": 20},
    "XLP":   {"name": "Consumer Staples SPDR",     "sector": "Consumer",      "base": 78.40,  "vol": 0.008, "mcap": 15},
    # Industrials / Materials / Utilities
    "XLI":   {"name": "Industrials Select SPDR",   "sector": "Industrials",   "base": 137.50, "vol": 0.011, "mcap": 20},
    "XLB":   {"name": "Materials Select SPDR",     "sector": "Materials",     "base": 92.10,  "vol": 0.013, "mcap": 6},
    "XLU":   {"name": "Utilities Select SPDR",     "sector": "Utilities",     "base": 71.80,  "vol": 0.009, "mcap": 14},
    # Bonds
    "TLT":   {"name": "iShares 20+ Year Bonds",    "sector": "Bonds",         "base": 91.50,  "vol": 0.010, "mcap": 50},
    "AGG":   {"name": "iShares Core Agg Bond",     "sector": "Bonds",         "base": 97.20,  "vol": 0.005, "mcap": 100},
    "HYG":   {"name": "iShares High Yield Corp",   "sector": "Bonds",         "base": 78.60,  "vol": 0.007, "mcap": 14},
    # Commodities
    "GLD":   {"name": "SPDR Gold Trust",           "sector": "Commodities",   "base": 239.80, "vol": 0.012, "mcap": 70},
    "SLV":   {"name": "iShares Silver Trust",      "sector": "Commodities",   "base": 27.90,  "vol": 0.018, "mcap": 12},
    "USO":   {"name": "United States Oil Fund",    "sector": "Commodities",   "base": 68.40,  "vol": 0.022, "mcap": 2},
    "DBA":   {"name": "Invesco Agriculture Fund",  "sector": "Commodities",   "base": 20.15,  "vol": 0.010, "mcap": 1},
    # International
    "EEM":   {"name": "iShares Emerging Markets",  "sector": "International", "base": 45.30,  "vol": 0.014, "mcap": 22},
    "VEA":   {"name": "Vanguard Dev. Markets",     "sector": "International", "base": 52.10,  "vol": 0.011, "mcap": 100},
    "EWJ":   {"name": "iShares Japan",             "sector": "International", "base": 69.80,  "vol": 0.013, "mcap": 10},
    "FXI":   {"name": "iShares China Large-Cap",   "sector": "International", "base": 32.80,  "vol": 0.020, "mcap": 5},
    # Benchmark
    "SPY":   {"name": "S&P 500 SPDR",              "sector": "Broad Market",  "base": 578.50, "vol": 0.012, "mcap": 550},
}

# Simulated daily drift per sector (annualised ≈ drift×252)
SECTOR_DRIFT: dict[str, float] = {
    "Crypto":        0.00080,
    "Technology":    0.00045,
    "Real Estate":  -0.00030,
    "Energy":        0.00020,
    "Healthcare":    0.00010,
    "Financials":    0.00025,
    "Consumer":      0.00010,
    "Industrials":   0.00015,
    "Materials":     0.00000,
    "Utilities":    -0.00015,
    "Bonds":        -0.00010,
    "Commodities":   0.00035,
    "International": 0.00010,
    "Broad Market":  0.00025,
}

# ---------------------------------------------------------------------------
# Price series generation
# ---------------------------------------------------------------------------

def _seed_for(symbol: str, day_offset: int = 0) -> int:
    base = int(symbol.encode().hex(), 16) % 999_983
    daily = int(time.time() // 86_400) + day_offset
    return (base * 6_364_136_223_846_793_005 + daily) % (2 ** 32)


def _generate_series(symbol: str, days: int) -> list[dict]:
    info = ETF_UNIVERSE[symbol]
    rng = random.Random(_seed_for(symbol))
    vol = info["vol"]
    drift = SECTOR_DRIFT.get(info["sector"], 0)

    # Build day-count raw prices (forward simulation from base)
    raw: list[float] = [info["base"]]
    for _ in range(days):
        ret = rng.gauss(drift, vol)
        raw.append(raw[-1] * (1 + ret))

    # Anchor end to base price so "today" is always near base
    scale = info["base"] / raw[-1]
    raw = [p * scale for p in raw]

    series: list[dict] = []
    today = datetime.utcnow().date()
    for i, close in enumerate(raw):
        d = today - timedelta(days=days - i)
        if d.weekday() >= 5:        # skip weekends
            continue
        o = close * (1 + rng.gauss(0, vol * 0.25))
        h = max(close, o) * (1 + abs(rng.gauss(0, vol * 0.15)))
        lo = min(close, o) * (1 - abs(rng.gauss(0, vol * 0.15)))
        vol_shares = max(100_000, int(rng.gauss(5_000_000, 1_200_000)))
        series.append({
            "date":   d.isoformat(),
            "open":   round(o, 2),
            "high":   round(h, 2),
            "low":    round(lo, 2),
            "close":  round(close, 2),
            "volume": vol_shares,
        })
    return series


# 60-second in-process cache
_quote_cache: dict = {}
_quote_cache_ts: float = 0.0


def _get_all_quotes() -> list[dict]:
    global _quote_cache, _quote_cache_ts
    if time.time() - _quote_cache_ts < 60 and _quote_cache:
        return list(_quote_cache.values())

    result: list[dict] = []
    for sym in ETF_UNIVERSE:
        series = _generate_series(sym, 380)
        if len(series) < 30:
            continue
        today = series[-1]
        cur = today["close"]
        prev_close      = series[-2]["close"]
        close_5d        = series[-6]["close"]  if len(series) > 6  else series[0]["close"]
        close_1m        = series[-22]["close"] if len(series) > 22 else series[0]["close"]
        close_3m        = series[-66]["close"] if len(series) > 66 else series[0]["close"]
        close_6m        = series[-130]["close"]if len(series) >130 else series[0]["close"]
        close_1y        = series[0]["close"]

        ytd_idx = next((i for i, b in enumerate(series)
                        if b["date"] >= f"{datetime.utcnow().year}-01-01"), 0)
        close_ytd = series[ytd_idx]["close"]

        q = {
            "symbol":    sym,
            "name":      ETF_UNIVERSE[sym]["name"],
            "sector":    ETF_UNIVERSE[sym]["sector"],
            "mcap":      ETF_UNIVERSE[sym]["mcap"],
            "price":     round(cur, 2),
            "change_1d": round((cur / prev_close - 1) * 100, 2),
            "change_5d": round((cur / close_5d  - 1) * 100, 2),
            "change_1m": round((cur / close_1m  - 1) * 100, 2),
            "change_3m": round((cur / close_3m  - 1) * 100, 2),
            "change_6m": round((cur / close_6m  - 1) * 100, 2),
            "change_1y": round((cur / close_1y  - 1) * 100, 2),
            "change_ytd":round((cur / close_ytd - 1) * 100, 2),
            "volume":    today["volume"],
        }
        result.append(q)
        _quote_cache[sym] = q

    _quote_cache_ts = time.time()
    return result


# ---------------------------------------------------------------------------
# Backtest engine
# ---------------------------------------------------------------------------

def _run_backtest(weights: dict[str, float], period: str) -> dict:
    """weights: {symbol: fraction} summing to 1.0.  period: 1y/3y/5y."""
    period_days = {"1y": 365, "3y": 1095, "5y": 1825}.get(period, 365)
    series_map: dict[str, list[dict]] = {
        sym: _generate_series(sym, period_days + 30)
        for sym in weights
    }
    spy_series = _generate_series("SPY", period_days + 30)

    # Align on common dates
    dates = sorted({b["date"] for b in spy_series})[-period_days:]

    portfolio: list[dict] = []
    bench: list[dict]     = []

    base_port: float | None = None
    base_spy:  float | None = None

    for date in dates:
        port_val = sum(
            w * next((b["close"] for b in series_map[sym] if b["date"] == date), None or 0)
            for sym, w in weights.items()
        )
        spy_val = next((b["close"] for b in spy_series if b["date"] == date), None)
        if port_val == 0 or spy_val is None:
            continue
        if base_port is None:
            base_port = port_val
            base_spy  = spy_val
        portfolio.append({"date": date, "value": round(port_val / base_port * 100, 4)})
        bench.append(    {"date": date, "value": round(spy_val  / base_spy  * 100, 4)})

    if len(portfolio) < 2:
        return {"portfolio": [], "benchmark": [], "stats": {}}

    # Stats
    port_ret = portfolio[-1]["value"] / 100 - 1
    spy_ret  = bench[-1]["value"]    / 100 - 1
    n_years  = len(portfolio) / 252
    cagr     = (1 + port_ret) ** (1 / n_years) - 1 if n_years > 0 else 0

    daily_rets = [
        portfolio[i]["value"] / portfolio[i-1]["value"] - 1
        for i in range(1, len(portfolio))
    ]
    mean_r = sum(daily_rets) / len(daily_rets)
    std_r  = math.sqrt(sum((r - mean_r) ** 2 for r in daily_rets) / len(daily_rets))
    sharpe = (mean_r / std_r * math.sqrt(252)) if std_r > 0 else 0

    peak = portfolio[0]["value"]
    max_dd = 0.0
    for p in portfolio:
        if p["value"] > peak:
            peak = p["value"]
        dd = (peak - p["value"]) / peak
        if dd > max_dd:
            max_dd = dd

    return {
        "portfolio": portfolio,
        "benchmark": bench,
        "stats": {
            "total_return":  round(port_ret * 100, 2),
            "cagr":          round(cagr * 100, 2),
            "sharpe":        round(sharpe, 2),
            "max_drawdown":  round(max_dd * 100, 2),
            "spy_return":    round(spy_ret * 100, 2),
        },
    }


# ---------------------------------------------------------------------------
# Global capital macro tree
# AUM in trillion USD (approximate 2024-2025 real-world estimates)
# ---------------------------------------------------------------------------

MACRO_TREE = [
    # ── Level 1: major asset classes ─────────────────────────────────────
    {"id": "equities",       "name": "全球股市",       "parent": "global", "aum": 109.0, "vol": 0.013, "color": "#4a90e2", "etfs": []},
    {"id": "bonds",          "name": "全球債券",       "parent": "global", "aum": 130.0, "vol": 0.005, "color": "#3f51b5", "etfs": []},
    {"id": "real_estate",    "name": "房地產",         "parent": "global", "aum":  11.0, "vol": 0.012, "color": "#8b6d4f", "etfs": []},
    {"id": "crypto",         "name": "加密貨幣",       "parent": "global", "aum":   2.5, "vol": 0.045, "color": "#f7931a", "etfs": []},
    {"id": "commodities",    "name": "大宗商品",       "parent": "global", "aum":   0.8, "vol": 0.018, "color": "#ffc107", "etfs": []},
    {"id": "cash_mm",        "name": "現金/貨幣市場",  "parent": "global", "aum":   6.5, "vol": 0.001, "color": "#607d8b", "etfs": []},
    # ── Level 2: equities ────────────────────────────────────────────────
    {"id": "us_equities",    "name": "美國股市",       "parent": "equities",    "aum": 46.0, "vol": 0.013, "color": "#5ba3f5",
     "etfs": ["QQQ","XLK","SMH","XLF","XLV","XLE","XLI","XLY","XLP","XLB","XLU"]},
    {"id": "dev_equities",   "name": "已開發市場",     "parent": "equities",    "aum": 40.0, "vol": 0.011, "color": "#7cbcf7",
     "etfs": ["VEA","EWJ"]},
    {"id": "em_equities",    "name": "新興市場",       "parent": "equities",    "aum": 23.0, "vol": 0.014, "color": "#a0d0fa",
     "etfs": ["EEM","FXI"]},
    # ── Level 2: bonds ───────────────────────────────────────────────────
    {"id": "us_treasury",    "name": "美國國債",       "parent": "bonds",       "aum": 30.0, "vol": 0.009, "color": "#5c6bc0", "etfs": ["TLT"]},
    {"id": "agg_bonds",      "name": "投資級債券",     "parent": "bonds",       "aum": 55.0, "vol": 0.005, "color": "#7986cb", "etfs": ["AGG"]},
    {"id": "hy_bonds",       "name": "高收益債券",     "parent": "bonds",       "aum": 20.0, "vol": 0.007, "color": "#9fa8da", "etfs": ["HYG"]},
    {"id": "intl_bonds",     "name": "國際債券",       "parent": "bonds",       "aum": 25.0, "vol": 0.006, "color": "#b3bcec", "etfs": []},
    # ── Level 2: real estate ─────────────────────────────────────────────
    {"id": "us_reits",       "name": "美國 REITs",     "parent": "real_estate", "aum": 4.5, "vol": 0.012, "color": "#a08060", "etfs": ["VNQ","IYR"]},
    {"id": "asia_reits",     "name": "亞太房地產",     "parent": "real_estate", "aum": 4.0, "vol": 0.013, "color": "#b8966e", "etfs": ["EWJ"]},
    {"id": "eu_reits",       "name": "歐洲房地產",     "parent": "real_estate", "aum": 2.5, "vol": 0.012, "color": "#c9a87c", "etfs": []},
    # ── Level 2: crypto ──────────────────────────────────────────────────
    {"id": "btc_seg",        "name": "Bitcoin",        "parent": "crypto",      "aum": 1.3, "vol": 0.045, "color": "#f7931a", "etfs": ["IBIT","BITO"]},
    {"id": "eth_seg",        "name": "Ethereum",       "parent": "crypto",      "aum": 0.5, "vol": 0.050, "color": "#627eea", "etfs": []},
    {"id": "alt_crypto",     "name": "其他加密資產",   "parent": "crypto",      "aum": 0.7, "vol": 0.060, "color": "#e91e8c", "etfs": ["ARKK"]},
    # ── Level 2: commodities ─────────────────────────────────────────────
    {"id": "precious_metals","name": "貴金屬",         "parent": "commodities", "aum": 0.40, "vol": 0.013, "color": "#ffd700", "etfs": ["GLD","SLV"]},
    {"id": "energy_comm",    "name": "能源原物料",     "parent": "commodities", "aum": 0.25, "vol": 0.022, "color": "#ff8c00", "etfs": ["USO","XOP"]},
    {"id": "agri_comm",      "name": "農業",           "parent": "commodities", "aum": 0.15, "vol": 0.010, "color": "#8bc34a", "etfs": ["DBA"]},
    # ── Level 3: US equity sectors ───────────────────────────────────────
    {"id": "tech_sector",    "name": "科技/半導體",    "parent": "us_equities", "aum": 16.0, "vol": 0.016, "color": "#4a90e2", "etfs": ["QQQ","XLK","SMH","ARKK"]},
    {"id": "health_sector",  "name": "醫療生技",       "parent": "us_equities", "aum":  7.0, "vol": 0.010, "color": "#27ae60", "etfs": ["XLV","IBB"]},
    {"id": "fin_sector",     "name": "金融",           "parent": "us_equities", "aum":  8.0, "vol": 0.013, "color": "#8e44ad", "etfs": ["XLF","KBE"]},
    {"id": "energy_sector",  "name": "能源",           "parent": "us_equities", "aum":  3.0, "vol": 0.018, "color": "#e67e22", "etfs": ["XLE","XOP"]},
    {"id": "cons_disc",      "name": "非必需消費",     "parent": "us_equities", "aum":  4.0, "vol": 0.014, "color": "#e91e8c", "etfs": ["XLY"]},
    {"id": "cons_staples",   "name": "必需消費",       "parent": "us_equities", "aum":  3.0, "vol": 0.008, "color": "#9c27b0", "etfs": ["XLP"]},
    {"id": "industrial",     "name": "工業",           "parent": "us_equities", "aum":  3.0, "vol": 0.011, "color": "#607d8b", "etfs": ["XLI"]},
    {"id": "materials",      "name": "材料",           "parent": "us_equities", "aum":  1.5, "vol": 0.013, "color": "#795548", "etfs": ["XLB"]},
    {"id": "utilities",      "name": "公用事業",       "parent": "us_equities", "aum":  1.5, "vol": 0.009, "color": "#00bcd4", "etfs": ["XLU"]},
]

# One representative ETF per "theme" for strategy rotation
THEME_ETF = {
    "科技":     "XLK",  "加密":     "IBIT", "房地產":   "VNQ",
    "能源":     "XLE",  "醫療":     "XLV",  "金融":     "XLF",
    "消費":     "XLY",  "工業":     "XLI",  "材料":     "XLB",
    "公用":     "XLU",  "債券":     "AGG",  "黃金":     "GLD",
    "國際":     "VEA",
}


def _node_change(node: dict, period: str, quotes_by_sym: dict) -> float:
    """Return weighted-average % change for a macro node for the given period."""
    key = f"change_{period}"
    etfs = [e for e in node.get("etfs", []) if e in quotes_by_sym]
    if etfs:
        return round(sum(quotes_by_sym[e][key] for e in etfs) / len(etfs), 2)
    # No ETFs → simulate with seeded random based on node id + day
    rng = random.Random(int(node["id"].encode().hex(), 16) % 999983
                        + int(time.time() // 86400))
    return round(rng.gauss(0, node["vol"] * 100 * _period_vol_scale(period)), 2)


def _period_vol_scale(period: str) -> float:
    return {"1d": 1, "5d": 2.2, "1m": 4.5, "3m": 7.5, "6m": 10, "1y": 14, "ytd": 10}.get(period, 1)


def _get_macro_data(period: str) -> dict:
    """Return the full macro hierarchy with AUM and period % changes."""
    quotes = _get_all_quotes()
    qmap   = {q["symbol"]: q for q in quotes}

    # Build children map
    children: dict[str, list] = {"global": []}
    for node in MACRO_TREE:
        parent = node["parent"]
        children.setdefault(parent, [])
        children[parent].append(node["id"])

    node_by_id: dict[str, dict] = {n["id"]: n for n in MACRO_TREE}

    def enrich(node_id: str) -> dict:
        if node_id == "global":
            kids = [enrich(c) for c in children.get("global", [])]
            total_aum = sum(k["aum"] for k in kids)
            w_change  = sum(k["aum"] * k["change"] for k in kids) / total_aum if total_aum else 0
            return {"id": "global", "name": "全球資金", "aum": round(total_aum, 1),
                    "change": round(w_change, 2), "color": "#58a6ff",
                    "children": kids, "etfs": []}
        node = dict(node_by_id[node_id])
        node["change"] = _node_change(node, period, qmap)
        kids = [enrich(c) for c in children.get(node_id, [])]
        if kids:
            total = sum(k["aum"] for k in kids)
            node["change"] = round(sum(k["aum"] * k["change"] for k in kids) / total, 2) if total else node["change"]
        node["children"] = kids
        # Attach ETF quotes
        node["etf_quotes"] = [
            {"symbol": e, "name": qmap[e]["name"], "price": qmap[e]["price"],
             "change": qmap[e].get(f"change_{period}", 0)}
            for e in node.get("etfs", []) if e in qmap
        ]
        return node

    return enrich("global")


# ---------------------------------------------------------------------------
# Strategy comparison backtest
# ---------------------------------------------------------------------------

def _run_strategy_backtest(period: str, top_n: int = 3) -> dict:
    """Compare momentum rotation vs equal-weight vs SPY over the given period."""
    period_days = {"1y": 365, "3y": 1095, "5y": 1825}.get(period, 365)

    # Generate series for all theme ETFs + SPY
    theme_syms = list(THEME_ETF.values())
    series_map: dict[str, list] = {
        sym: _generate_series(sym, period_days + 30)
        for sym in theme_syms
    }
    spy_series = _generate_series("SPY", period_days + 30)

    # Collect common sorted dates (last period_days trading days)
    all_dates = sorted({b["date"] for sym in theme_syms for b in series_map[sym]})[-period_days:]

    def price_on(sym: str, date: str) -> float | None:
        return next((b["close"] for b in series_map[sym] if b["date"] == date), None)

    # ── Momentum strategy ────────────────────────────────────────────────────
    mom_holdings: dict[str, float] = {s: 1 / len(theme_syms) for s in theme_syms}
    mom_vals: list[dict] = []
    prev_val_mom = 100.0
    REBAL_FREQ = 21  # trading days

    for i, date in enumerate(all_dates):
        if i % REBAL_FREQ == 0 and i >= REBAL_FREQ:
            lookback_date = all_dates[max(0, i - REBAL_FREQ)]
            rets = {}
            for sym in theme_syms:
                p0 = price_on(sym, lookback_date)
                p1 = price_on(sym, date)
                if p0 and p1:
                    rets[sym] = p1 / p0 - 1
            if len(rets) >= top_n:
                winners = sorted(rets, key=rets.__getitem__, reverse=True)[:top_n]
                mom_holdings = {s: (1 / top_n if s in winners else 0) for s in theme_syms}

        if i == 0:
            mom_vals.append({"date": date, "value": 100.0})
        else:
            prev_date = all_dates[i - 1]
            daily = sum(
                mom_holdings[s] * ((price_on(s, date) or 1) / (price_on(s, prev_date) or 1) - 1)
                for s in theme_syms
                if price_on(s, date) and price_on(s, prev_date)
            )
            prev_val_mom = mom_vals[-1]["value"] * (1 + daily)
            mom_vals.append({"date": date, "value": round(prev_val_mom, 4)})

    # ── Equal-weight strategy ────────────────────────────────────────────────
    eq_weight = 1 / len(theme_syms)
    eq_vals: list[dict] = [{"date": all_dates[0], "value": 100.0}]
    for i in range(1, len(all_dates)):
        date, prev_date = all_dates[i], all_dates[i - 1]
        daily = sum(
            eq_weight * ((price_on(s, date) or 1) / (price_on(s, prev_date) or 1) - 1)
            for s in theme_syms
            if price_on(s, date) and price_on(s, prev_date)
        )
        eq_vals.append({"date": date, "value": round(eq_vals[-1]["value"] * (1 + daily), 4)})

    # ── SPY buy-and-hold ────────────────────────────────────────────────────
    spy_by_date = {b["date"]: b["close"] for b in spy_series}
    spy_base    = spy_by_date.get(all_dates[0], 1)
    spy_vals    = [{"date": d, "value": round(spy_by_date.get(d, spy_base) / spy_base * 100, 4)}
                   for d in all_dates if d in spy_by_date]

    def _stats(vals: list[dict]) -> dict:
        if len(vals) < 5:
            return {}
        ret    = vals[-1]["value"] / 100 - 1
        ny     = len(vals) / 252
        cagr   = (1 + ret) ** (1 / ny) - 1 if ny > 0 else 0
        dr     = [vals[i]["value"] / vals[i - 1]["value"] - 1 for i in range(1, len(vals))]
        mean_r = sum(dr) / len(dr)
        std_r  = math.sqrt(sum((r - mean_r) ** 2 for r in dr) / len(dr))
        sharpe = (mean_r / std_r * math.sqrt(252)) if std_r > 0 else 0
        peak   = vals[0]["value"]
        max_dd = 0.0
        for v in vals:
            peak   = max(peak, v["value"])
            max_dd = max(max_dd, (peak - v["value"]) / peak)
        return {
            "total_return":  round(ret * 100, 2),
            "cagr":          round(cagr * 100, 2),
            "sharpe":        round(sharpe, 2),
            "max_drawdown":  round(max_dd * 100, 2),
        }

    return {
        "momentum":     mom_vals,
        "equal_weight": eq_vals,
        "spy":          spy_vals,
        "theme_names":  {v: k for k, v in THEME_ETF.items()},
        "stats": {
            "momentum":     _stats(mom_vals),
            "equal_weight": _stats(eq_vals),
            "spy":          _stats(spy_vals),
        },
    }


# ---------------------------------------------------------------------------
# HTTP handler
# ---------------------------------------------------------------------------

PERIOD_DAYS = {"1d": 2, "5d": 7, "1m": 35, "3m": 100, "6m": 195, "1y": 380, "ytd": 200}


class _Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, directory: str, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def log_message(self, fmt: str, *args) -> None:  # quieter logs
        sys.stderr.write(f"[{self.log_date_time_string()}] {fmt % args}\n")

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self._handle_api(parsed)
        else:
            super().do_GET()

    def _json(self, payload: object, status: int = 200) -> None:
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _handle_api(self, parsed: urllib.parse.ParseResult) -> None:
        qs   = urllib.parse.parse_qs(parsed.query)
        path = parsed.path

        try:
            if path == "/api/quotes":
                self._json(_get_all_quotes())

            elif path == "/api/history":
                sym    = (qs.get("symbol", ["SPY"])[0]).upper()
                period = qs.get("period", ["1y"])[0]
                days   = PERIOD_DAYS.get(period, 380)
                if sym not in ETF_UNIVERSE:
                    self._json({"error": "unknown symbol"}, 400)
                    return
                series = _generate_series(sym, days)
                self._json({"symbol": sym, "period": period, "series": series})

            elif path == "/api/sectors":
                quotes = _get_all_quotes()
                period = qs.get("period", ["1d"])[0]
                key    = f"change_{period}"
                sectors: dict[str, dict] = {}
                for q in quotes:
                    sec = q["sector"]
                    if sec not in sectors:
                        sectors[sec] = {"sector": sec, "change": 0.0,
                                        "mcap": 0, "etfs": []}
                    sectors[sec]["etfs"].append({"symbol": q["symbol"],
                                                 "change": q.get(key, 0)})
                    sectors[sec]["mcap"] += q["mcap"]
                # weighted avg change
                for sec, data in sectors.items():
                    total_m = sum(ETF_UNIVERSE[e["symbol"]]["mcap"]
                                  for e in data["etfs"])
                    data["change"] = round(
                        sum(e["change"] * ETF_UNIVERSE[e["symbol"]]["mcap"]
                            for e in data["etfs"]) / total_m, 2
                    ) if total_m else 0
                self._json(list(sectors.values()))

            elif path == "/api/backtest":
                raw_w  = qs.get("weights", ["SPY:1"])[0]
                period = qs.get("period", ["1y"])[0]
                weights: dict[str, float] = {}
                for part in raw_w.split(","):
                    if ":" in part:
                        s, w = part.split(":", 1)
                        s = s.strip().upper()
                        if s in ETF_UNIVERSE:
                            weights[s] = float(w) / 100
                if not weights:
                    self._json({"error": "no valid weights"}, 400)
                    return
                total = sum(weights.values())
                weights = {s: w / total for s, w in weights.items()}
                self._json(_run_backtest(weights, period))

            elif path == "/api/macro":
                period = qs.get("period", ["1d"])[0]
                self._json(_get_macro_data(period))

            elif path == "/api/strategy-backtest":
                period = qs.get("period", ["1y"])[0]
                top_n  = int(qs.get("top_n", ["3"])[0])
                self._json(_run_strategy_backtest(period, top_n))

            else:
                self._json({"error": "not found"}, 404)

        except Exception as exc:
            self._json({"error": str(exc)}, 500)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Fund Flow Dashboard dev server")
    p.add_argument("--host",      default="0.0.0.0")
    p.add_argument("--port",      type=int, default=8000)
    p.add_argument("--directory", default=str(Path(__file__).resolve().parent))
    return p.parse_args()


def _local_ip() -> str | None:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        return None


def main() -> None:
    args = _parse_args()
    directory = str(Path(args.directory).resolve())
    handler   = partial(_Handler, directory=directory)

    try:
        server = http.server.ThreadingHTTPServer((args.host, args.port), handler)
    except OSError as exc:
        print(f"Cannot bind {args.host}:{args.port}: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc

    print(f"Fund Flow Dashboard → http://localhost:{args.port}")
    if args.host == "0.0.0.0":
        ip = _local_ip()
        if ip:
            print(f"Network             → http://{ip}:{args.port}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
