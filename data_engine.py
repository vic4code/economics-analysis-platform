"""data_engine.py – Pure data generation layer (no HTTP concerns).

All mock market data, seeded random number generation, and financial
calculations live here. serve.py imports these functions and serves them
over HTTP; data.js mirrors the same logic for GitHub Pages static mode.
"""

from __future__ import annotations

import math
import random
import time
from datetime import datetime, timedelta

# ---------------------------------------------------------------------------
# Universe & simulation parameters
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

# period string → trading-day count used for history queries
PERIOD_DAYS: dict[str, int] = {
    "1d": 2, "5d": 7, "1m": 35, "3m": 100,
    "6m": 195, "1y": 380, "ytd": 200,
}

PERIOD_VOL_SCALE: dict[str, float] = {
    "1d": 1, "5d": 2.2, "1m": 4.5, "3m": 7.5,
    "6m": 10, "1y": 14, "ytd": 10,
}

# Sectors covered by at least one non-SPY ETF
SECTOR_ETFS: dict[str, list[str]] = {}
for _sym, _meta in ETF_UNIVERSE.items():
    if _sym == "SPY":
        continue
    SECTOR_ETFS.setdefault(_meta["sector"], []).append(_sym)

MACRO_TREE: list[dict] = [
    # ── Level 1: major asset classes ─────────────────────────────────────
    {"id": "equities",        "name": "全球股市",      "parent": "global",      "aum": 109.0, "vol": 0.013, "color": "#4a90e2", "etfs": []},
    {"id": "bonds",           "name": "全球債券",      "parent": "global",      "aum": 130.0, "vol": 0.005, "color": "#3f51b5", "etfs": []},
    {"id": "real_estate",     "name": "房地產",        "parent": "global",      "aum":  11.0, "vol": 0.012, "color": "#8b6d4f", "etfs": []},
    {"id": "crypto",          "name": "加密貨幣",      "parent": "global",      "aum":   2.5, "vol": 0.045, "color": "#f7931a", "etfs": []},
    {"id": "commodities",     "name": "大宗商品",      "parent": "global",      "aum":   0.8, "vol": 0.018, "color": "#ffc107", "etfs": []},
    {"id": "cash_mm",         "name": "現金/貨幣市場", "parent": "global",      "aum":   6.5, "vol": 0.001, "color": "#607d8b", "etfs": []},
    # ── Level 2: equities ────────────────────────────────────────────────
    {"id": "us_equities",     "name": "美國股市",      "parent": "equities",    "aum": 46.0,  "vol": 0.013, "color": "#5ba3f5",
     "etfs": ["QQQ","XLK","SMH","XLF","XLV","XLE","XLI","XLY","XLP","XLB","XLU"]},
    {"id": "dev_equities",    "name": "已開發市場",    "parent": "equities",    "aum": 40.0,  "vol": 0.011, "color": "#7cbcf7", "etfs": ["VEA","EWJ"]},
    {"id": "em_equities",     "name": "新興市場",      "parent": "equities",    "aum": 23.0,  "vol": 0.014, "color": "#a0d0fa", "etfs": ["EEM","FXI"]},
    # ── Level 2: bonds ───────────────────────────────────────────────────
    {"id": "us_treasury",     "name": "美國國債",      "parent": "bonds",       "aum": 30.0,  "vol": 0.009, "color": "#5c6bc0", "etfs": ["TLT"]},
    {"id": "agg_bonds",       "name": "投資級債券",    "parent": "bonds",       "aum": 55.0,  "vol": 0.005, "color": "#7986cb", "etfs": ["AGG"]},
    {"id": "hy_bonds",        "name": "高收益債券",    "parent": "bonds",       "aum": 20.0,  "vol": 0.007, "color": "#9fa8da", "etfs": ["HYG"]},
    {"id": "intl_bonds",      "name": "國際債券",      "parent": "bonds",       "aum": 25.0,  "vol": 0.006, "color": "#b3bcec", "etfs": []},
    # ── Level 2: real estate ─────────────────────────────────────────────
    {"id": "us_reits",        "name": "美國 REITs",    "parent": "real_estate", "aum": 4.5,   "vol": 0.012, "color": "#a08060", "etfs": ["VNQ","IYR"]},
    {"id": "asia_reits",      "name": "亞太房地產",    "parent": "real_estate", "aum": 4.0,   "vol": 0.013, "color": "#b8966e", "etfs": ["EWJ"]},
    {"id": "eu_reits",        "name": "歐洲房地產",    "parent": "real_estate", "aum": 2.5,   "vol": 0.012, "color": "#c9a87c", "etfs": []},
    # ── Level 2: crypto ──────────────────────────────────────────────────
    {"id": "btc_seg",         "name": "Bitcoin",       "parent": "crypto",      "aum": 1.3,   "vol": 0.045, "color": "#f7931a", "etfs": ["IBIT","BITO"]},
    {"id": "eth_seg",         "name": "Ethereum",      "parent": "crypto",      "aum": 0.5,   "vol": 0.050, "color": "#627eea", "etfs": []},
    {"id": "alt_crypto",      "name": "其他加密資產",  "parent": "crypto",      "aum": 0.7,   "vol": 0.060, "color": "#e91e8c", "etfs": ["ARKK"]},
    # ── Level 2: commodities ─────────────────────────────────────────────
    {"id": "precious_metals", "name": "貴金屬",        "parent": "commodities", "aum": 0.40,  "vol": 0.013, "color": "#ffd700", "etfs": ["GLD","SLV"]},
    {"id": "energy_comm",     "name": "能源原物料",    "parent": "commodities", "aum": 0.25,  "vol": 0.022, "color": "#ff8c00", "etfs": ["USO","XOP"]},
    {"id": "agri_comm",       "name": "農業",          "parent": "commodities", "aum": 0.15,  "vol": 0.010, "color": "#8bc34a", "etfs": ["DBA"]},
    # ── Level 3: US equity sectors ───────────────────────────────────────
    {"id": "tech_sector",     "name": "科技/半導體",   "parent": "us_equities", "aum": 16.0,  "vol": 0.016, "color": "#4a90e2", "etfs": ["QQQ","XLK","SMH","ARKK"]},
    {"id": "health_sector",   "name": "醫療生技",      "parent": "us_equities", "aum":  7.0,  "vol": 0.010, "color": "#27ae60", "etfs": ["XLV","IBB"]},
    {"id": "fin_sector",      "name": "金融",          "parent": "us_equities", "aum":  8.0,  "vol": 0.013, "color": "#8e44ad", "etfs": ["XLF","KBE"]},
    {"id": "energy_sector",   "name": "能源",          "parent": "us_equities", "aum":  3.0,  "vol": 0.018, "color": "#e67e22", "etfs": ["XLE","XOP"]},
    {"id": "cons_disc",       "name": "非必需消費",    "parent": "us_equities", "aum":  4.0,  "vol": 0.014, "color": "#e91e8c", "etfs": ["XLY"]},
    {"id": "cons_staples",    "name": "必需消費",      "parent": "us_equities", "aum":  3.0,  "vol": 0.008, "color": "#9c27b0", "etfs": ["XLP"]},
    {"id": "industrial",      "name": "工業",          "parent": "us_equities", "aum":  3.0,  "vol": 0.011, "color": "#607d8b", "etfs": ["XLI"]},
    {"id": "materials",       "name": "材料",          "parent": "us_equities", "aum":  1.5,  "vol": 0.013, "color": "#795548", "etfs": ["XLB"]},
    {"id": "utilities",       "name": "公用事業",      "parent": "us_equities", "aum":  1.5,  "vol": 0.009, "color": "#00bcd4", "etfs": ["XLU"]},
]

THEME_ETF: dict[str, str] = {
    "科技": "XLK",  "加密": "IBIT", "房地產": "VNQ",
    "能源": "XLE",  "醫療": "XLV",  "金融":   "XLF",
    "消費": "XLY",  "工業": "XLI",  "材料":   "XLB",
    "公用": "XLU",  "債券": "AGG",  "黃金":   "GLD",
    "國際": "VEA",
}

MOCK_EVENTS: list[dict] = [
    {"date": "2024-03-20", "title": "Fed 維持利率 5.25–5.50%", "type": "fed",
     "sectors": ["Bonds", "Financials", "Utilities"], "magnitude": 0,
     "detail": "FOMC 決議維持利率不變，點陣圖暗示年內 3 次降息。"},
    {"date": "2024-05-01", "title": "Fed 暗示降息時間表延後", "type": "fed",
     "sectors": ["Bonds", "Technology", "Real Estate"], "magnitude": -1,
     "detail": "通膨數據持續頑固，市場降息預期大幅後移，科技股承壓。"},
    {"date": "2024-07-11", "title": "CPI 低於預期，降息希望升溫", "type": "macro",
     "sectors": ["Bonds", "Real Estate", "Utilities"], "magnitude": 2,
     "detail": "6 月 CPI YoY 3.0%，低於預期，市場押注 9 月降息。"},
    {"date": "2024-08-05", "title": "日圓套利交易解除，全球股市暴跌", "type": "geopolitical",
     "sectors": ["International", "Technology", "Crypto"], "magnitude": -3,
     "detail": "日銀升息導致日圓套利交易平倉潮，VIX 飆升至 38。"},
    {"date": "2024-09-18", "title": "Fed 首次降息 50bps", "type": "fed",
     "sectors": ["Bonds", "Real Estate", "Financials"], "magnitude": 2,
     "detail": "聯準會宣布降息 2 碼，為 4 年來首次降息。"},
    {"date": "2024-10-17", "title": "Nvidia Blackwell 晶片量產確認", "type": "earnings",
     "sectors": ["Technology"], "magnitude": 2,
     "detail": "Blackwell GPU 需求爆炸，AI 基礎建設投資持續加速。"},
    {"date": "2024-11-06", "title": "川普當選美國總統", "type": "geopolitical",
     "sectors": ["Financials", "Energy", "Crypto"], "magnitude": 3,
     "detail": "共和黨橫掃國會，市場預期減稅＋鬆綁金融監管，金融股大漲。"},
    {"date": "2024-12-18", "title": "Fed 降息但點陣圖偏鷹", "type": "fed",
     "sectors": ["Bonds", "Technology", "Real Estate"], "magnitude": -2,
     "detail": "降息 1 碼但 2025 年預期僅 2 次降息，遠少於市場預期，股市大跌。"},
    {"date": "2025-01-20", "title": "川普就職，宣布緊急經濟狀態", "type": "geopolitical",
     "sectors": ["Energy", "Commodities", "International"], "magnitude": 1,
     "detail": "宣布對中國、加拿大、墨西哥加徵關稅，能源政策大轉向。"},
    {"date": "2025-01-27", "title": "DeepSeek R1 震撼 AI 市場", "type": "earnings",
     "sectors": ["Technology", "Commodities"], "magnitude": -2,
     "detail": "中國 DeepSeek 以低成本媲美 GPT-4，Nvidia 單日市值蒸發約 6000 億美元。"},
    {"date": "2025-02-19", "title": "比特幣突破 $100,000", "type": "macro",
     "sectors": ["Crypto"], "magnitude": 3,
     "detail": "機構持續買進 IBIT，比特幣市值超越白銀，加密板塊整體大漲。"},
    {"date": "2025-03-04", "title": "關稅戰升級，中美貿易緊張", "type": "geopolitical",
     "sectors": ["International", "Materials", "Consumer"], "magnitude": -2,
     "detail": "美國宣布對中國商品加徵額外 25% 關稅，供應鏈重組預期升溫。"},
    {"date": "2025-04-02", "title": "解放日：史上最大規模關稅宣布", "type": "geopolitical",
     "sectors": ["International", "Consumer", "Industrials", "Materials"], "magnitude": -3,
     "detail": "對逾 90 個國家課徵對等關稅，全球股市劇烈震盪。"},
    {"date": "2025-04-09", "title": "關稅暫停 90 天，市場強彈", "type": "geopolitical",
     "sectors": ["Technology", "Consumer", "International"], "magnitude": 3,
     "detail": "川普宣布對多數國家關稅暫停，納指單日漲逾 12%，史上前三大漲幅之一。"},
    {"date": "2025-04-22", "title": "Fed 鮑威爾警告關稅推升通膨", "type": "fed",
     "sectors": ["Bonds", "Technology"], "magnitude": -1,
     "detail": "主席強調通膨風險上升，降息時間表更加不確定。"},
    {"date": "2025-05-07", "title": "Fed 維持利率不變", "type": "fed",
     "sectors": ["Bonds", "Real Estate"], "magnitude": 0,
     "detail": "Fed 會後聲明維持謹慎立場，等待更多通膨數據明朗化。"},
]

TRADING_DAYS_PER_YEAR = 252

# ---------------------------------------------------------------------------
# Seeded price generation
# ---------------------------------------------------------------------------

def seed_for(symbol: str, day_offset: int = 0) -> int:
    base  = int(symbol.encode().hex(), 16) % 999_983
    daily = int(time.time() // 86_400) + day_offset
    return (base * 6_364_136_223_846_793_005 + daily) % (2 ** 32)


def generate_series(symbol: str, days: int) -> list[dict]:
    info  = ETF_UNIVERSE[symbol]
    rng   = random.Random(seed_for(symbol))
    vol   = info["vol"]
    drift = SECTOR_DRIFT.get(info["sector"], 0)

    raw: list[float] = [info["base"]]
    for _ in range(days):
        raw.append(raw[-1] * (1 + rng.gauss(drift, vol)))

    scale = info["base"] / raw[-1]
    raw   = [p * scale for p in raw]

    series: list[dict] = []
    today = datetime.utcnow().date()
    for i, close in enumerate(raw):
        d = today - timedelta(days=days - i)
        if d.weekday() >= 5:
            continue
        o        = close * (1 + rng.gauss(0, vol * 0.25))
        h        = max(close, o) * (1 + abs(rng.gauss(0, vol * 0.15)))
        lo       = min(close, o) * (1 - abs(rng.gauss(0, vol * 0.15)))
        vol_shs  = max(100_000, int(rng.gauss(5_000_000, 1_200_000)))
        series.append({
            "date":   d.isoformat(),
            "open":   round(o, 2),
            "high":   round(h, 2),
            "low":    round(lo, 2),
            "close":  round(close, 2),
            "volume": vol_shs,
        })
    return series

# ---------------------------------------------------------------------------
# Quote cache
# ---------------------------------------------------------------------------

class QuoteCache:
    TTL = 60.0

    def __init__(self) -> None:
        self._data: dict[str, dict] = {}
        self._ts: float = 0.0

    def get(self) -> list[dict]:
        if time.time() - self._ts < self.TTL and self._data:
            return list(self._data.values())
        return self._refresh()

    def _refresh(self) -> list[dict]:
        result: list[dict] = []
        year_start = f"{datetime.utcnow().year}-01-01"

        for sym in ETF_UNIVERSE:
            series = generate_series(sym, 380)
            if len(series) < 30:
                continue
            n   = len(series)
            cur = series[-1]["close"]

            def price_at(idx: int) -> float:
                return series[idx]["close"] if 0 <= idx < n else series[0]["close"]

            ytd_idx   = next((i for i, b in enumerate(series) if b["date"] >= year_start), 0)
            q = {
                "symbol":     sym,
                "name":       ETF_UNIVERSE[sym]["name"],
                "sector":     ETF_UNIVERSE[sym]["sector"],
                "mcap":       ETF_UNIVERSE[sym]["mcap"],
                "price":      round(cur, 2),
                "change_1d":  round((cur / price_at(n - 2)   - 1) * 100, 2),
                "change_5d":  round((cur / price_at(n - 6)   - 1) * 100, 2),
                "change_1m":  round((cur / price_at(n - 22)  - 1) * 100, 2),
                "change_3m":  round((cur / price_at(n - 66)  - 1) * 100, 2),
                "change_6m":  round((cur / price_at(n - 130) - 1) * 100, 2),
                "change_1y":  round((cur / series[0]["close"] - 1) * 100, 2),
                "change_ytd": round((cur / series[ytd_idx]["close"] - 1) * 100, 2),
                "volume":     series[-1]["volume"],
            }
            result.append(q)
            self._data[sym] = q

        self._ts = time.time()
        return result


_quote_cache = QuoteCache()

def get_all_quotes() -> list[dict]:
    return _quote_cache.get()

# ---------------------------------------------------------------------------
# Shared statistics helper
# ---------------------------------------------------------------------------

def compute_stats(vals: list[dict]) -> dict:
    """Compute return/CAGR/Sharpe/max-drawdown from an indexed series."""
    if len(vals) < 5:
        return {}
    ret    = vals[-1]["value"] / 100 - 1
    ny     = len(vals) / TRADING_DAYS_PER_YEAR
    cagr   = (1 + ret) ** (1 / ny) - 1 if ny > 0 else 0
    dr     = [vals[i]["value"] / vals[i - 1]["value"] - 1 for i in range(1, len(vals))]
    mean_r = sum(dr) / len(dr)
    std_r  = math.sqrt(sum((r - mean_r) ** 2 for r in dr) / len(dr))
    sharpe = (mean_r / std_r * math.sqrt(TRADING_DAYS_PER_YEAR)) if std_r > 0 else 0
    peak   = vals[0]["value"]
    max_dd = 0.0
    for v in vals:
        peak   = max(peak, v["value"])
        max_dd = max(max_dd, (peak - v["value"]) / peak)
    return {
        "total_return": round(ret    * 100, 2),
        "cagr":         round(cagr   * 100, 2),
        "sharpe":       round(sharpe, 2),
        "max_drawdown": round(max_dd * 100, 2),
    }

# ---------------------------------------------------------------------------
# Portfolio backtest
# ---------------------------------------------------------------------------

def run_backtest(weights: dict[str, float], period: str) -> dict:
    """weights: {symbol: fraction} summing to 1.0."""
    period_days = {"1y": 365, "3y": 1095, "5y": 1825}.get(period, 365)
    series_map  = {sym: generate_series(sym, period_days + 30) for sym in weights}
    spy_series  = generate_series("SPY", period_days + 30)

    dates = sorted({b["date"] for b in spy_series})[-period_days:]

    # Index each series by date for O(1) lookup
    sym_idx = {sym: {b["date"]: b["close"] for b in s} for sym, s in series_map.items()}
    spy_idx = {b["date"]: b["close"] for b in spy_series}

    portfolio: list[dict] = []
    bench:     list[dict] = []
    base_port: float | None = None
    base_spy:  float | None = None

    for date in dates:
        port_val = sum(w * sym_idx[sym].get(date, 0) for sym, w in weights.items())
        spy_val  = spy_idx.get(date)
        if not port_val or spy_val is None:
            continue
        if base_port is None:
            base_port, base_spy = port_val, spy_val
        portfolio.append({"date": date, "value": round(port_val / base_port * 100, 4)})
        bench.append(    {"date": date, "value": round(spy_val  / base_spy  * 100, 4)})

    if len(portfolio) < 2:
        return {"portfolio": [], "benchmark": [], "stats": {}}

    stats = compute_stats(portfolio)
    stats["spy_return"] = round(bench[-1]["value"] / 100 - 1, 4) * 100 if bench else 0
    return {"portfolio": portfolio, "benchmark": bench, "stats": stats}

# ---------------------------------------------------------------------------
# Strategy comparison backtest
# ---------------------------------------------------------------------------

def run_strategy_backtest(period: str, top_n: int = 3) -> dict:
    period_days = {"1y": 365, "3y": 1095, "5y": 1825}.get(period, 365)
    theme_syms  = list(THEME_ETF.values())
    series_map  = {sym: generate_series(sym, period_days + 30) for sym in theme_syms}
    spy_series  = generate_series("SPY", period_days + 30)

    all_dates = sorted({b["date"] for sym in theme_syms for b in series_map[sym]})[-period_days:]
    sym_idx   = {sym: {b["date"]: b["close"] for b in s} for sym, s in series_map.items()}

    def price_on(sym: str, date: str) -> float | None:
        return sym_idx[sym].get(date)

    REBAL_FREQ = 21
    mom_holdings: dict[str, float] = {s: 1 / len(theme_syms) for s in theme_syms}
    mom_vals: list[dict] = []

    for i, date in enumerate(all_dates):
        if i > 0 and i % REBAL_FREQ == 0:
            lookback = all_dates[max(0, i - REBAL_FREQ)]
            rets = {s: price_on(s, date) / price_on(s, lookback) - 1
                    for s in theme_syms
                    if price_on(s, date) and price_on(s, lookback)}
            if len(rets) >= top_n:
                winners = sorted(rets, key=rets.__getitem__, reverse=True)[:top_n]
                mom_holdings = {s: (1 / top_n if s in winners else 0) for s in theme_syms}

        if i == 0:
            mom_vals.append({"date": date, "value": 100.0})
        else:
            prev = all_dates[i - 1]
            daily = sum(
                mom_holdings[s] * (price_on(s, date) / price_on(s, prev) - 1)
                for s in theme_syms
                if price_on(s, date) and price_on(s, prev)
            )
            mom_vals.append({"date": date, "value": round(mom_vals[-1]["value"] * (1 + daily), 4)})

    eq_w    = 1 / len(theme_syms)
    eq_vals = [{"date": all_dates[0], "value": 100.0}]
    for i in range(1, len(all_dates)):
        date, prev = all_dates[i], all_dates[i - 1]
        daily = sum(
            eq_w * (price_on(s, date) / price_on(s, prev) - 1)
            for s in theme_syms
            if price_on(s, date) and price_on(s, prev)
        )
        eq_vals.append({"date": date, "value": round(eq_vals[-1]["value"] * (1 + daily), 4)})

    spy_idx_d = {b["date"]: b["close"] for b in spy_series}
    spy_base  = spy_idx_d.get(all_dates[0], 1)
    spy_vals  = [{"date": d, "value": round(spy_idx_d[d] / spy_base * 100, 4)}
                 for d in all_dates if d in spy_idx_d]

    return {
        "momentum":     mom_vals,
        "equal_weight": eq_vals,
        "spy":          spy_vals,
        "theme_names":  {v: k for k, v in THEME_ETF.items()},
        "stats": {
            "momentum":     compute_stats(mom_vals),
            "equal_weight": compute_stats(eq_vals),
            "spy":          compute_stats(spy_vals),
        },
    }

# ---------------------------------------------------------------------------
# Macro capital hierarchy
# ---------------------------------------------------------------------------

def _node_change(node: dict, period: str, quotes_by_sym: dict) -> float:
    key  = f"change_{period}"
    etfs = [e for e in node.get("etfs", []) if e in quotes_by_sym]
    if etfs:
        return round(sum(quotes_by_sym[e][key] for e in etfs) / len(etfs), 2)
    rng = random.Random(int(node["id"].encode().hex(), 16) % 999_983
                        + int(time.time() // 86_400))
    return round(rng.gauss(0, node["vol"] * 100 * PERIOD_VOL_SCALE.get(period, 1)), 2)


def get_macro_data(period: str) -> dict:
    qmap = {q["symbol"]: q for q in get_all_quotes()}

    children: dict[str, list] = {"global": []}
    for node in MACRO_TREE:
        children.setdefault(node["parent"], []).append(node["id"])
    node_by_id = {n["id"]: n for n in MACRO_TREE}

    def enrich(node_id: str) -> dict:
        if node_id == "global":
            kids      = [enrich(c) for c in children.get("global", [])]
            total_aum = sum(k["aum"] for k in kids)
            w_change  = sum(k["aum"] * k["change"] for k in kids) / total_aum if total_aum else 0
            return {"id": "global", "name": "全球資金", "aum": round(total_aum, 1),
                    "change": round(w_change, 2), "color": "#58a6ff",
                    "children": kids, "etfs": []}
        node         = dict(node_by_id[node_id])
        node["change"] = _node_change(node, period, qmap)
        kids           = [enrich(c) for c in children.get(node_id, [])]
        if kids:
            total = sum(k["aum"] for k in kids)
            node["change"] = round(sum(k["aum"] * k["change"] for k in kids) / total, 2) if total else node["change"]
        node["children"]   = kids
        node["etf_quotes"] = [
            {"symbol": e, "name": qmap[e]["name"], "price": qmap[e]["price"],
             "change": qmap[e].get(f"change_{period}", 0)}
            for e in node.get("etfs", []) if e in qmap
        ]
        return node

    return enrich("global")

# ---------------------------------------------------------------------------
# Institutional chip simulation
# ---------------------------------------------------------------------------

def get_chips_data(period: str) -> list[dict]:
    chip_days = {"1d": 5, "5d": 10, "1m": 22, "3m": 66, "6m": 130, "1y": 252, "ytd": 100}
    days  = chip_days.get(period, 22)
    qmap  = {q["symbol"]: q for q in get_all_quotes()}
    today = datetime.utcnow().date()

    result: list[dict] = []
    for sector, etfs in SECTOR_ETFS.items():
        momentum  = sum(qmap[e][f"change_{period}"] for e in etfs if e in qmap) / max(len(etfs), 1)
        inst_bias = momentum * 30

        rng_inst  = random.Random(seed_for(sector + "_inst"))
        rng_smart = random.Random(seed_for(sector + "_smart"))
        rng_ret   = random.Random(seed_for(sector + "_retail"))

        dates, institutional, smart_money, retail, cumulative = [], [], [], [], []
        cum = 0.0

        for i in range(days):
            d = today - timedelta(days=days - 1 - i)
            if d.weekday() >= 5:
                continue
            dates.append(d.isoformat())
            inst  = round(rng_inst.gauss(inst_bias * 0.6,  abs(inst_bias) * 0.8 + 80), 1)
            smart = round(rng_smart.gauss(inst_bias * 0.3, abs(inst_bias) * 0.5 + 40), 1)
            ret   = round(rng_ret.gauss(-inst_bias * 0.2,  abs(inst_bias) * 0.6 + 50), 1)
            cum  += inst
            institutional.append(inst)
            smart_money.append(smart)
            retail.append(ret)
            cumulative.append(round(cum, 1))

        result.append({
            "sector":        sector,
            "flow_score":    round(momentum * 1.5, 2),
            "dates":         dates,
            "institutional": institutional,
            "smart_money":   smart_money,
            "retail":        retail,
            "cumulative":    cumulative,
        })

    result.sort(key=lambda x: x["flow_score"], reverse=True)
    return result

# ---------------------------------------------------------------------------
# Flow matrix
# ---------------------------------------------------------------------------

def get_flow_matrix(period: str) -> dict:
    chips      = get_chips_data(period)
    qmap       = {q["symbol"]: q for q in get_all_quotes()}
    sectors    = [c["sector"] for c in chips]
    flow_scores = [c["flow_score"] for c in chips]

    volume_ratios: list[float] = []
    for sec in sectors:
        etfs = SECTOR_ETFS.get(sec, [])
        if not etfs:
            volume_ratios.append(1.0)
            continue
        avg_vol    = sum(qmap[e]["volume"] for e in etfs if e in qmap) / max(len(etfs), 1)
        base_vols  = [
            sum(b["volume"] for b in generate_series(e, 35)[-22:]) / 22
            for e in etfs[:2]
        ]
        base_vol   = sum(base_vols) / len(base_vols) if base_vols else avg_vol
        volume_ratios.append(round(avg_vol / base_vol, 2) if base_vol else 1.0)

    n = len(sectors)
    rotation_matrix = [
        [
            1.0 if i == j else round(
                (1 if (flow_scores[i] > 0) == (flow_scores[j] > 0) else -1)
                * max(0, 1 - abs(flow_scores[i] - flow_scores[j]) / 6),
                2,
            )
            for j in range(n)
        ]
        for i in range(n)
    ]

    return {
        "sectors":         sectors,
        "flow_scores":     flow_scores,
        "volume_ratios":   volume_ratios,
        "mcaps":           [sum(ETF_UNIVERSE[e]["mcap"] for e in SECTOR_ETFS.get(s, [])) for s in sectors],
        "rotation_matrix": rotation_matrix,
    }

# ---------------------------------------------------------------------------
# Cycle / historical monthly returns
# ---------------------------------------------------------------------------

MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]


def get_cycle_data() -> list[dict]:
    qmap  = {q["symbol"]: q for q in get_all_quotes()}
    today = datetime.utcnow().date()

    result: list[dict] = []
    for sector, etfs in SECTOR_ETFS.items():
        etf_syms = [e for e in etfs if e in qmap]
        if not etf_syms:
            continue

        series_list = [generate_series(e, 730) for e in etf_syms[:2]]

        monthly: dict[str, float] = {}
        for year_offset in range(3):
            for month in range(1, 13):
                yr = today.year - year_offset
                if yr == today.year and month > today.month:
                    continue
                key    = f"{yr}-{month:02d}"
                prefix = key + "-"
                bars   = sorted(
                    (b for s in series_list for b in s if b["date"].startswith(prefix)),
                    key=lambda b: b["date"],
                )
                if len(bars) < 2:
                    continue
                monthly[key] = round((bars[-1]["close"] / bars[0]["close"] - 1) * 100, 2)

        monthly_sorted = dict(sorted(monthly.items()))
        all_returns    = list(monthly_sorted.values())
        cur_1y = sum(qmap[e].get("change_1y", 0) for e in etf_syms) / len(etf_syms)
        rank   = round(sum(1 for r in all_returns if r <= cur_1y) / len(all_returns) * 100) if all_returns else 50

        by_month: dict[int, list[float]] = {}
        for key, ret in monthly_sorted.items():
            by_month.setdefault(int(key.split("-")[1]), []).append(ret)
        avg_by_month = sorted(((m, sum(v) / len(v)) for m, v in by_month.items()), key=lambda x: x[1])
        worst_months = [MONTH_NAMES[m - 1] for m, _ in avg_by_month[:2]]
        best_months  = [MONTH_NAMES[m - 1] for m, _ in avg_by_month[-2:]]

        color = next((n["color"] for n in MACRO_TREE
                      if n.get("etfs") and etf_syms[0] in n["etfs"]), "#58a6ff")

        result.append({
            "sector":          sector,
            "monthly_returns": monthly_sorted,
            "percentile_rank": rank,
            "current_1y":      round(cur_1y, 2),
            "best_months":     best_months,
            "worst_months":    worst_months,
            "color":           color,
        })

    return result
