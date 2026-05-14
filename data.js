/**
 * data.js – JavaScript port of serve.py mock data generation.
 * Used for static GitHub Pages deployment (no Python server required).
 * Exposes window.API_IMPL with the same data contracts as the API routes.
 */
(function () {
  'use strict';

  // ── Seeded PRNG (Mulberry32) ──────────────────────────────────────────
  class SeededRandom {
    constructor(seed) {
      this._s = (seed >>> 0) || 1;
    }
    _next() {
      let z = (this._s = (this._s + 0x6D2B79F5) >>> 0);
      z = Math.imul(z ^ (z >>> 14), (z & 0xFFFF0000) | 1);
      z ^= z + Math.imul(z ^ (z >>> 7), z | 0x3D8193B);
      return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    }
    gauss(mu, sigma) {
      const u1 = Math.max(1e-10, this._next());
      const u2 = this._next();
      const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return mu + z0 * sigma;
    }
  }

  function seedFor(symbol) {
    let hexStr = '';
    for (let i = 0; i < symbol.length; i++) {
      hexStr += symbol.charCodeAt(i).toString(16).padStart(2, '0');
    }
    const base  = BigInt('0x' + hexStr) % 999983n;
    const daily = BigInt(Math.floor(Date.now() / 86400000));
    return Number((base * 6364136223846793005n + daily) % 4294967296n);
  }

  // ── ETF Universe ──────────────────────────────────────────────────────
  const ETF_UNIVERSE = {
    IBIT: { name: 'iShares Bitcoin Trust',    sector: 'Crypto',        base: 55.40,  vol: 0.045, mcap: 38  },
    BITO: { name: 'ProShares Bitcoin ETF',    sector: 'Crypto',        base: 28.15,  vol: 0.042, mcap: 12  },
    QQQ:  { name: 'Nasdaq 100',               sector: 'Technology',    base: 484.50, vol: 0.015, mcap: 280 },
    XLK:  { name: 'Technology Select SPDR',   sector: 'Technology',    base: 215.30, vol: 0.014, mcap: 68  },
    SMH:  { name: 'VanEck Semiconductor',     sector: 'Technology',    base: 218.40, vol: 0.020, mcap: 22  },
    ARKK: { name: 'ARK Innovation',           sector: 'Technology',    base: 55.80,  vol: 0.030, mcap: 8   },
    VNQ:  { name: 'Vanguard Real Estate',     sector: 'Real Estate',   base: 84.20,  vol: 0.012, mcap: 34  },
    IYR:  { name: 'iShares Real Estate',      sector: 'Real Estate',   base: 87.50,  vol: 0.012, mcap: 28  },
    XLE:  { name: 'Energy Select SPDR',       sector: 'Energy',        base: 91.80,  vol: 0.018, mcap: 38  },
    XOP:  { name: 'Oil & Gas E&P SPDR',       sector: 'Energy',        base: 147.60, vol: 0.022, mcap: 4   },
    XLV:  { name: 'Healthcare Select SPDR',   sector: 'Healthcare',    base: 148.20, vol: 0.010, mcap: 38  },
    IBB:  { name: 'iShares Biotech',          sector: 'Healthcare',    base: 137.80, vol: 0.018, mcap: 8   },
    XLF:  { name: 'Financials Select SPDR',   sector: 'Financials',    base: 45.20,  vol: 0.013, mcap: 42  },
    KBE:  { name: 'SPDR S&P Bank ETF',        sector: 'Financials',    base: 47.90,  vol: 0.016, mcap: 2   },
    XLY:  { name: 'Consumer Discret. SPDR',   sector: 'Consumer',      base: 194.60, vol: 0.014, mcap: 20  },
    XLP:  { name: 'Consumer Staples SPDR',    sector: 'Consumer',      base: 78.40,  vol: 0.008, mcap: 15  },
    XLI:  { name: 'Industrials Select SPDR',  sector: 'Industrials',   base: 137.50, vol: 0.011, mcap: 20  },
    XLB:  { name: 'Materials Select SPDR',    sector: 'Materials',     base: 92.10,  vol: 0.013, mcap: 6   },
    XLU:  { name: 'Utilities Select SPDR',    sector: 'Utilities',     base: 71.80,  vol: 0.009, mcap: 14  },
    TLT:  { name: 'iShares 20+ Year Bonds',   sector: 'Bonds',         base: 91.50,  vol: 0.010, mcap: 50  },
    AGG:  { name: 'iShares Core Agg Bond',    sector: 'Bonds',         base: 97.20,  vol: 0.005, mcap: 100 },
    HYG:  { name: 'iShares High Yield Corp',  sector: 'Bonds',         base: 78.60,  vol: 0.007, mcap: 14  },
    GLD:  { name: 'SPDR Gold Trust',          sector: 'Commodities',   base: 239.80, vol: 0.012, mcap: 70  },
    SLV:  { name: 'iShares Silver Trust',     sector: 'Commodities',   base: 27.90,  vol: 0.018, mcap: 12  },
    USO:  { name: 'United States Oil Fund',   sector: 'Commodities',   base: 68.40,  vol: 0.022, mcap: 2   },
    DBA:  { name: 'Invesco Agriculture Fund', sector: 'Commodities',   base: 20.15,  vol: 0.010, mcap: 1   },
    EEM:  { name: 'iShares Emerging Markets', sector: 'International', base: 45.30,  vol: 0.014, mcap: 22  },
    VEA:  { name: 'Vanguard Dev. Markets',    sector: 'International', base: 52.10,  vol: 0.011, mcap: 100 },
    EWJ:  { name: 'iShares Japan',            sector: 'International', base: 69.80,  vol: 0.013, mcap: 10  },
    FXI:  { name: 'iShares China Large-Cap',  sector: 'International', base: 32.80,  vol: 0.020, mcap: 5   },
    SPY:  { name: 'S&P 500 SPDR',             sector: 'Broad Market',  base: 578.50, vol: 0.012, mcap: 550 },
  };

  const SECTOR_DRIFT = {
    Crypto:        0.00080,
    Technology:    0.00045,
    'Real Estate': -0.00030,
    Energy:        0.00020,
    Healthcare:    0.00010,
    Financials:    0.00025,
    Consumer:      0.00010,
    Industrials:   0.00015,
    Materials:     0.00000,
    Utilities:    -0.00015,
    Bonds:        -0.00010,
    Commodities:   0.00035,
    International: 0.00010,
    'Broad Market': 0.00025,
  };

  const MACRO_TREE = [
    // Level 1
    { id: 'equities',        name: '全球股市',      parent: 'global',      aum: 109.0, vol: 0.013, color: '#4a90e2', etfs: [] },
    { id: 'bonds',           name: '全球債券',      parent: 'global',      aum: 130.0, vol: 0.005, color: '#3f51b5', etfs: [] },
    { id: 'real_estate',     name: '房地產',        parent: 'global',      aum:  11.0, vol: 0.012, color: '#8b6d4f', etfs: [] },
    { id: 'crypto',          name: '加密貨幣',      parent: 'global',      aum:   2.5, vol: 0.045, color: '#f7931a', etfs: [] },
    { id: 'commodities',     name: '大宗商品',      parent: 'global',      aum:   0.8, vol: 0.018, color: '#ffc107', etfs: [] },
    { id: 'cash_mm',         name: '現金/貨幣市場', parent: 'global',      aum:   6.5, vol: 0.001, color: '#607d8b', etfs: [] },
    // Level 2 – equities
    { id: 'us_equities',     name: '美國股市',      parent: 'equities',    aum: 46.0, vol: 0.013, color: '#5ba3f5',
      etfs: ['QQQ','XLK','SMH','XLF','XLV','XLE','XLI','XLY','XLP','XLB','XLU'] },
    { id: 'dev_equities',    name: '已開發市場',    parent: 'equities',    aum: 40.0, vol: 0.011, color: '#7cbcf7', etfs: ['VEA','EWJ'] },
    { id: 'em_equities',     name: '新興市場',      parent: 'equities',    aum: 23.0, vol: 0.014, color: '#a0d0fa', etfs: ['EEM','FXI'] },
    // Level 2 – bonds
    { id: 'us_treasury',     name: '美國國債',      parent: 'bonds',       aum: 30.0, vol: 0.009, color: '#5c6bc0', etfs: ['TLT'] },
    { id: 'agg_bonds',       name: '投資級債券',    parent: 'bonds',       aum: 55.0, vol: 0.005, color: '#7986cb', etfs: ['AGG'] },
    { id: 'hy_bonds',        name: '高收益債券',    parent: 'bonds',       aum: 20.0, vol: 0.007, color: '#9fa8da', etfs: ['HYG'] },
    { id: 'intl_bonds',      name: '國際債券',      parent: 'bonds',       aum: 25.0, vol: 0.006, color: '#b3bcec', etfs: [] },
    // Level 2 – real estate
    { id: 'us_reits',        name: '美國 REITs',    parent: 'real_estate', aum: 4.5, vol: 0.012, color: '#a08060', etfs: ['VNQ','IYR'] },
    { id: 'asia_reits',      name: '亞太房地產',    parent: 'real_estate', aum: 4.0, vol: 0.013, color: '#b8966e', etfs: ['EWJ'] },
    { id: 'eu_reits',        name: '歐洲房地產',    parent: 'real_estate', aum: 2.5, vol: 0.012, color: '#c9a87c', etfs: [] },
    // Level 2 – crypto
    { id: 'btc_seg',         name: 'Bitcoin',       parent: 'crypto',      aum: 1.3, vol: 0.045, color: '#f7931a', etfs: ['IBIT','BITO'] },
    { id: 'eth_seg',         name: 'Ethereum',      parent: 'crypto',      aum: 0.5, vol: 0.050, color: '#627eea', etfs: [] },
    { id: 'alt_crypto',      name: '其他加密資產',  parent: 'crypto',      aum: 0.7, vol: 0.060, color: '#e91e8c', etfs: ['ARKK'] },
    // Level 2 – commodities
    { id: 'precious_metals', name: '貴金屬',        parent: 'commodities', aum: 0.40, vol: 0.013, color: '#ffd700', etfs: ['GLD','SLV'] },
    { id: 'energy_comm',     name: '能源原物料',    parent: 'commodities', aum: 0.25, vol: 0.022, color: '#ff8c00', etfs: ['USO','XOP'] },
    { id: 'agri_comm',       name: '農業',          parent: 'commodities', aum: 0.15, vol: 0.010, color: '#8bc34a', etfs: ['DBA'] },
    // Level 3 – US sectors
    { id: 'tech_sector',     name: '科技/半導體',   parent: 'us_equities', aum: 16.0, vol: 0.016, color: '#4a90e2', etfs: ['QQQ','XLK','SMH','ARKK'] },
    { id: 'health_sector',   name: '醫療生技',      parent: 'us_equities', aum:  7.0, vol: 0.010, color: '#27ae60', etfs: ['XLV','IBB'] },
    { id: 'fin_sector',      name: '金融',          parent: 'us_equities', aum:  8.0, vol: 0.013, color: '#8e44ad', etfs: ['XLF','KBE'] },
    { id: 'energy_sector',   name: '能源',          parent: 'us_equities', aum:  3.0, vol: 0.018, color: '#e67e22', etfs: ['XLE','XOP'] },
    { id: 'cons_disc',       name: '非必需消費',    parent: 'us_equities', aum:  4.0, vol: 0.014, color: '#e91e8c', etfs: ['XLY'] },
    { id: 'cons_staples',    name: '必需消費',      parent: 'us_equities', aum:  3.0, vol: 0.008, color: '#9c27b0', etfs: ['XLP'] },
    { id: 'industrial',      name: '工業',          parent: 'us_equities', aum:  3.0, vol: 0.011, color: '#607d8b', etfs: ['XLI'] },
    { id: 'materials',       name: '材料',          parent: 'us_equities', aum:  1.5, vol: 0.013, color: '#795548', etfs: ['XLB'] },
    { id: 'utilities',       name: '公用事業',      parent: 'us_equities', aum:  1.5, vol: 0.009, color: '#00bcd4', etfs: ['XLU'] },
  ];

  const THEME_ETF = {
    '科技': 'XLK', '加密': 'IBIT', '房地產': 'VNQ',
    '能源': 'XLE', '醫療': 'XLV', '金融':   'XLF',
    '消費': 'XLY', '工業': 'XLI', '材料':   'XLB',
    '公用': 'XLU', '債券': 'AGG', '黃金':   'GLD',
    '國際': 'VEA',
  };

  const PERIOD_DAYS = { '1d': 2, '5d': 7, '1m': 35, '3m': 100, '6m': 195, '1y': 380, ytd: 200 };
  const PERIOD_VOL_SCALE = { '1d': 1, '5d': 2.2, '1m': 4.5, '3m': 7.5, '6m': 10, '1y': 14, ytd: 10 };

  // ── Date helpers ───────────────────────────────────────────────────────
  function isoDate(d) { return d.toISOString().slice(0, 10); }

  // ── Series generation ──────────────────────────────────────────────────
  function generateSeries(symbol, days) {
    const info = ETF_UNIVERSE[symbol];
    if (!info) return [];
    const rng   = new SeededRandom(seedFor(symbol));
    const vol   = info.vol;
    const drift = SECTOR_DRIFT[info.sector] || 0;

    const raw = [info.base];
    for (let i = 0; i < days; i++) {
      raw.push(raw[raw.length - 1] * (1 + rng.gauss(drift, vol)));
    }
    const scale = info.base / raw[raw.length - 1];
    for (let i = 0; i < raw.length; i++) raw[i] *= scale;

    const series = [];
    const today  = new Date();
    const todayMs = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

    for (let i = 0; i <= days; i++) {
      const d = new Date(todayMs - (days - i) * 86400000);
      if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
      const close = raw[i];
      const o  = close * (1 + rng.gauss(0, vol * 0.25));
      const h  = Math.max(close, o) * (1 + Math.abs(rng.gauss(0, vol * 0.15)));
      const lo = Math.min(close, o) * (1 - Math.abs(rng.gauss(0, vol * 0.15)));
      const v  = Math.max(100000, Math.round(rng.gauss(5000000, 1200000)));
      series.push({
        date:   isoDate(d),
        open:   Math.round(o  * 100) / 100,
        high:   Math.round(h  * 100) / 100,
        low:    Math.round(lo * 100) / 100,
        close:  Math.round(close * 100) / 100,
        volume: v,
      });
    }
    return series;
  }

  // ── Quote cache ────────────────────────────────────────────────────────
  let _quoteCache = null;
  let _quoteCacheTs = 0;

  function getAllQuotes() {
    if (_quoteCache && Date.now() - _quoteCacheTs < 60000) return _quoteCache;

    const yearStart = new Date().getUTCFullYear() + '-01-01';
    const result = [];

    for (const sym of Object.keys(ETF_UNIVERSE)) {
      const series = generateSeries(sym, 380);
      if (series.length < 30) continue;
      const n   = series.length;
      const cur = series[n - 1].close;

      const p = (idx) => idx >= 0 && idx < n ? series[idx].close : series[0].close;
      const c1d  = p(n - 2);
      const c5d  = p(n - 6);
      const c1m  = p(n - 22);
      const c3m  = p(n - 66);
      const c6m  = p(n - 130);
      const c1y  = series[0].close;
      const ytdI = series.findIndex(b => b.date >= yearStart);
      const cYtd = ytdI >= 0 ? series[ytdI].close : series[0].close;

      const pct = (a, b) => Math.round((a / b - 1) * 10000) / 100;
      result.push({
        symbol:     sym,
        name:       ETF_UNIVERSE[sym].name,
        sector:     ETF_UNIVERSE[sym].sector,
        mcap:       ETF_UNIVERSE[sym].mcap,
        price:      Math.round(cur * 100) / 100,
        change_1d:  pct(cur, c1d),
        change_5d:  pct(cur, c5d),
        change_1m:  pct(cur, c1m),
        change_3m:  pct(cur, c3m),
        change_6m:  pct(cur, c6m),
        change_1y:  pct(cur, c1y),
        change_ytd: pct(cur, cYtd),
        volume:     series[n - 1].volume,
      });
    }
    _quoteCache   = result;
    _quoteCacheTs = Date.now();
    return result;
  }

  // ── Sectors ────────────────────────────────────────────────────────────
  function getSectors(period) {
    const key    = `change_${period}`;
    const quotes = getAllQuotes();
    const map    = {};
    for (const q of quotes) {
      const sec = q.sector;
      if (!map[sec]) map[sec] = { sector: sec, change: 0, mcap: 0, etfs: [] };
      map[sec].etfs.push({ symbol: q.symbol, change: q[key] || 0 });
      map[sec].mcap += q.mcap;
    }
    for (const sec of Object.keys(map)) {
      const totalM = map[sec].etfs.reduce((s, e) => s + (ETF_UNIVERSE[e.symbol]?.mcap || 0), 0);
      map[sec].change = totalM
        ? Math.round(map[sec].etfs.reduce((s, e) => s + e.change * (ETF_UNIVERSE[e.symbol]?.mcap || 0), 0) / totalM * 100) / 100
        : 0;
    }
    return Object.values(map);
  }

  // ── Macro data ─────────────────────────────────────────────────────────
  function getMacroData(period) {
    const quotes = getAllQuotes();
    const qmap   = {};
    for (const q of quotes) qmap[q.symbol] = q;

    const children = { global: [] };
    for (const node of MACRO_TREE) {
      if (!children[node.parent]) children[node.parent] = [];
      children[node.parent].push(node.id);
    }
    const nodeById = {};
    for (const node of MACRO_TREE) nodeById[node.id] = node;

    function nodeChange(node) {
      const key  = `change_${period}`;
      const etfs = (node.etfs || []).filter(e => qmap[e]);
      if (etfs.length > 0) {
        return Math.round(etfs.reduce((s, e) => s + qmap[e][key], 0) / etfs.length * 100) / 100;
      }
      let hexStr = '';
      for (let i = 0; i < node.id.length; i++) hexStr += node.id.charCodeAt(i).toString(16).padStart(2, '0');
      const base  = Number(BigInt('0x' + hexStr) % 999983n);
      const daily = Math.floor(Date.now() / 86400000);
      const rng   = new SeededRandom((base + daily) >>> 0);
      const scale = PERIOD_VOL_SCALE[period] || 1;
      return Math.round(rng.gauss(0, node.vol * 100 * scale) * 100) / 100;
    }

    function enrich(nodeId) {
      if (nodeId === 'global') {
        const kids     = (children.global || []).map(enrich);
        const totalAum = kids.reduce((s, k) => s + k.aum, 0);
        const wChange  = kids.reduce((s, k) => s + k.aum * k.change, 0) / (totalAum || 1);
        return { id: 'global', name: '全球資金', aum: Math.round(totalAum * 10) / 10,
                 change: Math.round(wChange * 100) / 100, color: '#58a6ff',
                 children: kids, etfs: [], etf_quotes: [] };
      }
      const node   = { ...nodeById[nodeId] };
      node.change  = nodeChange(node);
      const kids   = (children[nodeId] || []).map(enrich);
      if (kids.length > 0) {
        const total  = kids.reduce((s, k) => s + k.aum, 0);
        node.change  = total > 0
          ? Math.round(kids.reduce((s, k) => s + k.aum * k.change, 0) / total * 100) / 100
          : node.change;
      }
      node.children  = kids;
      node.etf_quotes = (node.etfs || []).filter(e => qmap[e]).map(e => ({
        symbol: e,
        name:   qmap[e].name,
        price:  qmap[e].price,
        change: qmap[e][`change_${period}`] || 0,
      }));
      return node;
    }
    return enrich('global');
  }

  // ── Portfolio backtest ─────────────────────────────────────────────────
  function runBacktest(weightsStr, period) {
    const weights = {};
    for (const part of weightsStr.split(',')) {
      const idx = part.indexOf(':');
      if (idx < 0) continue;
      const sym = part.slice(0, idx).trim().toUpperCase();
      const pct = parseFloat(part.slice(idx + 1));
      if (sym in ETF_UNIVERSE) weights[sym] = pct / 100;
    }
    const total = Object.values(weights).reduce((s, v) => s + v, 0);
    if (!total) return { portfolio: [], benchmark: [], stats: {} };
    for (const s of Object.keys(weights)) weights[s] /= total;

    const periodDays = { '1y': 365, '3y': 1095, '5y': 1825 }[period] || 365;
    const seriesMap  = {};
    for (const sym of Object.keys(weights)) seriesMap[sym] = generateSeries(sym, periodDays + 30);
    const spySeries  = generateSeries('SPY', periodDays + 30);

    const allDates = [...new Set(spySeries.map(b => b.date))].sort().slice(-periodDays);

    const makeIndex = (series) => {
      const m = {};
      for (const b of series) m[b.date] = b.close;
      return m;
    };
    const spyIdx = makeIndex(spySeries);
    const symIdx = {};
    for (const [sym, s] of Object.entries(seriesMap)) symIdx[sym] = makeIndex(s);

    const portfolio = [], bench = [];
    let basePt = null, baseSpy = null;

    for (const date of allDates) {
      let portVal = 0;
      for (const [sym, w] of Object.entries(weights)) {
        if (symIdx[sym][date]) portVal += w * symIdx[sym][date];
      }
      const spyVal = spyIdx[date];
      if (!portVal || !spyVal) continue;
      if (basePt === null) { basePt = portVal; baseSpy = spyVal; }
      portfolio.push({ date, value: Math.round(portVal / basePt * 10000) / 100 });
      bench.push({ date, value: Math.round(spyVal / baseSpy * 10000) / 100 });
    }
    if (portfolio.length < 2) return { portfolio: [], benchmark: [], stats: {} };

    const portRet = portfolio[portfolio.length - 1].value / 100 - 1;
    const spyRet  = bench[bench.length - 1].value / 100 - 1;
    const nYears  = portfolio.length / 252;
    const cagr    = nYears > 0 ? Math.pow(1 + portRet, 1 / nYears) - 1 : 0;
    const dr      = portfolio.slice(1).map((p, i) => p.value / portfolio[i].value - 1);
    const mean    = dr.reduce((s, r) => s + r, 0) / dr.length;
    const std     = Math.sqrt(dr.reduce((s, r) => s + (r - mean) ** 2, 0) / dr.length);
    const sharpe  = std > 0 ? mean / std * Math.sqrt(252) : 0;
    let peak = portfolio[0].value, maxDd = 0;
    for (const p of portfolio) {
      if (p.value > peak) peak = p.value;
      maxDd = Math.max(maxDd, (peak - p.value) / peak);
    }
    return {
      portfolio, benchmark: bench,
      stats: {
        total_return: Math.round(portRet * 10000) / 100,
        cagr:         Math.round(cagr    * 10000) / 100,
        sharpe:       Math.round(sharpe  * 100)   / 100,
        max_drawdown: Math.round(maxDd   * 10000) / 100,
        spy_return:   Math.round(spyRet  * 10000) / 100,
      },
    };
  }

  // ── Strategy backtest ──────────────────────────────────────────────────
  function runStrategyBacktest(period, topN) {
    topN = topN || 3;
    const periodDays = { '1y': 365, '3y': 1095, '5y': 1825 }[period] || 365;
    const themeSyms  = Object.values(THEME_ETF);
    const seriesMap  = {};
    for (const sym of themeSyms) seriesMap[sym] = generateSeries(sym, periodDays + 30);
    const spySeries  = generateSeries('SPY', periodDays + 30);

    const allDates = [...new Set(
      themeSyms.flatMap(s => seriesMap[s].map(b => b.date))
    )].sort().slice(-periodDays);

    const symIdx = {};
    for (const sym of themeSyms) {
      symIdx[sym] = {};
      for (const b of seriesMap[sym]) symIdx[sym][b.date] = b.close;
    }

    const p = (sym, date) => symIdx[sym][date] || null;

    // Momentum
    let momH = {};
    for (const s of themeSyms) momH[s] = 1 / themeSyms.length;
    const momVals = [];
    const REBAL   = 21;

    for (let i = 0; i < allDates.length; i++) {
      const date = allDates[i];
      if (i > 0 && i % REBAL === 0) {
        const lookback = allDates[Math.max(0, i - REBAL)];
        const rets = {};
        for (const s of themeSyms) {
          const p0 = p(s, lookback), p1 = p(s, date);
          if (p0 && p1) rets[s] = p1 / p0 - 1;
        }
        if (Object.keys(rets).length >= topN) {
          const winners = Object.entries(rets).sort((a, b) => b[1] - a[1]).slice(0, topN).map(e => e[0]);
          momH = {};
          for (const s of themeSyms) momH[s] = winners.includes(s) ? 1 / topN : 0;
        }
      }
      if (i === 0) {
        momVals.push({ date, value: 100.0 });
      } else {
        const prev  = allDates[i - 1];
        const daily = themeSyms.reduce((s, sym) => {
          const p0 = p(sym, prev), p1 = p(sym, date);
          return (p0 && p1) ? s + momH[sym] * (p1 / p0 - 1) : s;
        }, 0);
        momVals.push({ date, value: Math.round(momVals[i - 1].value * (1 + daily) * 10000) / 10000 });
      }
    }

    // Equal-weight
    const eqW    = 1 / themeSyms.length;
    const eqVals = [{ date: allDates[0], value: 100.0 }];
    for (let i = 1; i < allDates.length; i++) {
      const date = allDates[i], prev = allDates[i - 1];
      const daily = themeSyms.reduce((s, sym) => {
        const p0 = p(sym, prev), p1 = p(sym, date);
        return (p0 && p1) ? s + eqW * (p1 / p0 - 1) : s;
      }, 0);
      eqVals.push({ date, value: Math.round(eqVals[i - 1].value * (1 + daily) * 10000) / 10000 });
    }

    // SPY
    const spyByDate = {};
    for (const b of spySeries) spyByDate[b.date] = b.close;
    const spyBase = spyByDate[allDates[0]] || 1;
    const spyVals = allDates.filter(d => spyByDate[d]).map(d => ({
      date: d, value: Math.round(spyByDate[d] / spyBase * 100 * 10000) / 10000,
    }));

    function calcStats(vals) {
      if (vals.length < 5) return {};
      const ret    = vals[vals.length - 1].value / 100 - 1;
      const ny     = vals.length / 252;
      const cagr   = ny > 0 ? Math.pow(1 + ret, 1 / ny) - 1 : 0;
      const dr     = vals.slice(1).map((v, i) => v.value / vals[i].value - 1);
      const mean   = dr.reduce((s, r) => s + r, 0) / dr.length;
      const std    = Math.sqrt(dr.reduce((s, r) => s + (r - mean) ** 2, 0) / dr.length);
      const sharpe = std > 0 ? mean / std * Math.sqrt(252) : 0;
      let peak = vals[0].value, maxDd = 0;
      for (const v of vals) {
        if (v.value > peak) peak = v.value;
        maxDd = Math.max(maxDd, (peak - v.value) / peak);
      }
      return {
        total_return: Math.round(ret    * 10000) / 100,
        cagr:         Math.round(cagr   * 10000) / 100,
        sharpe:       Math.round(sharpe * 100)   / 100,
        max_drawdown: Math.round(maxDd  * 10000) / 100,
      };
    }

    const themeNames = {};
    for (const [k, v] of Object.entries(THEME_ETF)) themeNames[v] = k;

    return {
      momentum: momVals, equal_weight: eqVals, spy: spyVals,
      theme_names: themeNames,
      stats: {
        momentum:     calcStats(momVals),
        equal_weight: calcStats(eqVals),
        spy:          calcStats(spyVals),
      },
    };
  }

  // ── handleLocal – routes static API calls ──────────────────────────────
  function handleLocal(path) {
    const [pathname, qs] = path.split('?');
    const params = {};
    if (qs) {
      for (const part of qs.split('&')) {
        const [k, v] = part.split('=');
        params[decodeURIComponent(k)] = decodeURIComponent(v || '');
      }
    }
    switch (pathname) {
      case '/api/quotes':
        return getAllQuotes();
      case '/api/history': {
        const sym    = (params.symbol || 'SPY').toUpperCase();
        const period = params.period || '1y';
        const days   = PERIOD_DAYS[period] || 380;
        return { symbol: sym, period, series: generateSeries(sym, days) };
      }
      case '/api/sectors':
        return getSectors(params.period || '1d');
      case '/api/backtest':
        return runBacktest(params.weights || 'SPY:100', params.period || '1y');
      case '/api/macro':
        return getMacroData(params.period || '1d');
      case '/api/strategy-backtest':
        return runStrategyBacktest(params.period || '1y', parseInt(params.top_n || '3', 10));
      default:
        throw new Error(`Unknown static route: ${pathname}`);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────
  window.API_IMPL = {
    getAllQuotes,
    generateSeries,
    getSectors,
    getMacroData,
    runBacktest,
    runStrategyBacktest,
    handleLocal,
  };
})();
