export interface EtfInfo {
  name: string;
  sector: string;
  base: number;
  vol: number;
  mcap: number;
}

export interface MacroTreeNode {
  id: string;
  name: string;
  parent: string;
  aum: number;
  vol: number;
  color: string;
  etfs: string[];
}

export interface MockEvent {
  date: string;
  title: string;
  type: 'fed' | 'macro' | 'geopolitical' | 'earnings';
  sectors: string[];
  magnitude: number;
  detail: string;
}

export const ETF_UNIVERSE: Record<string, EtfInfo> = {
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

export const SECTOR_DRIFT: Record<string, number> = {
  'Crypto':        0.00080,
  'Technology':    0.00045,
  'Real Estate':  -0.00030,
  'Energy':        0.00020,
  'Healthcare':    0.00010,
  'Financials':    0.00025,
  'Consumer':      0.00010,
  'Industrials':   0.00015,
  'Materials':     0.00000,
  'Utilities':    -0.00015,
  'Bonds':        -0.00010,
  'Commodities':   0.00035,
  'International': 0.00010,
  'Broad Market':  0.00025,
};

export const PERIOD_DAYS: Record<string, number> = {
  '1d': 2, '5d': 7, '1m': 35, '3m': 100, '6m': 195, '1y': 380, 'ytd': 200,
};

export const PERIOD_VOL_SCALE: Record<string, number> = {
  '1d': 1, '5d': 2.2, '1m': 4.5, '3m': 7.5, '6m': 10, '1y': 14, 'ytd': 10,
};

export const MACRO_TREE: MacroTreeNode[] = [
  { id: 'equities',        name: '全球股市',      parent: 'global',      aum: 109.0, vol: 0.013, color: '#4a90e2', etfs: [] },
  { id: 'bonds',           name: '全球債券',      parent: 'global',      aum: 130.0, vol: 0.005, color: '#3f51b5', etfs: [] },
  { id: 'real_estate',     name: '房地產',        parent: 'global',      aum:  11.0, vol: 0.012, color: '#8b6d4f', etfs: [] },
  { id: 'crypto',          name: '加密貨幣',      parent: 'global',      aum:   2.5, vol: 0.045, color: '#f7931a', etfs: [] },
  { id: 'commodities',     name: '大宗商品',      parent: 'global',      aum:   0.8, vol: 0.018, color: '#ffc107', etfs: [] },
  { id: 'cash_mm',         name: '現金/貨幣市場', parent: 'global',      aum:   6.5, vol: 0.001, color: '#607d8b', etfs: [] },
  { id: 'us_equities',     name: '美國股市',      parent: 'equities',    aum: 46.0,  vol: 0.013, color: '#5ba3f5',
    etfs: ['QQQ','XLK','SMH','XLF','XLV','XLE','XLI','XLY','XLP','XLB','XLU'] },
  { id: 'dev_equities',    name: '已開發市場',    parent: 'equities',    aum: 40.0,  vol: 0.011, color: '#7cbcf7', etfs: ['VEA','EWJ'] },
  { id: 'em_equities',     name: '新興市場',      parent: 'equities',    aum: 23.0,  vol: 0.014, color: '#a0d0fa', etfs: ['EEM','FXI'] },
  { id: 'us_treasury',     name: '美國國債',      parent: 'bonds',       aum: 30.0,  vol: 0.009, color: '#5c6bc0', etfs: ['TLT'] },
  { id: 'agg_bonds',       name: '投資級債券',    parent: 'bonds',       aum: 55.0,  vol: 0.005, color: '#7986cb', etfs: ['AGG'] },
  { id: 'hy_bonds',        name: '高收益債券',    parent: 'bonds',       aum: 20.0,  vol: 0.007, color: '#9fa8da', etfs: ['HYG'] },
  { id: 'intl_bonds',      name: '國際債券',      parent: 'bonds',       aum: 25.0,  vol: 0.006, color: '#b3bcec', etfs: [] },
  { id: 'us_reits',        name: '美國 REITs',    parent: 'real_estate', aum:  4.5,  vol: 0.012, color: '#a08060', etfs: ['VNQ','IYR'] },
  { id: 'asia_reits',      name: '亞太房地產',    parent: 'real_estate', aum:  4.0,  vol: 0.013, color: '#b8966e', etfs: ['EWJ'] },
  { id: 'eu_reits',        name: '歐洲房地產',    parent: 'real_estate', aum:  2.5,  vol: 0.012, color: '#c9a87c', etfs: [] },
  { id: 'btc_seg',         name: 'Bitcoin',       parent: 'crypto',      aum:  1.3,  vol: 0.045, color: '#f7931a', etfs: ['IBIT','BITO'] },
  { id: 'eth_seg',         name: 'Ethereum',      parent: 'crypto',      aum:  0.5,  vol: 0.050, color: '#627eea', etfs: [] },
  { id: 'alt_crypto',      name: '其他加密資產',  parent: 'crypto',      aum:  0.7,  vol: 0.060, color: '#e91e8c', etfs: ['ARKK'] },
  { id: 'precious_metals', name: '貴金屬',        parent: 'commodities', aum:  0.40, vol: 0.013, color: '#ffd700', etfs: ['GLD','SLV'] },
  { id: 'energy_comm',     name: '能源原物料',    parent: 'commodities', aum:  0.25, vol: 0.022, color: '#ff8c00', etfs: ['USO','XOP'] },
  { id: 'agri_comm',       name: '農業',          parent: 'commodities', aum:  0.15, vol: 0.010, color: '#8bc34a', etfs: ['DBA'] },
  { id: 'tech_sector',     name: '科技/半導體',   parent: 'us_equities', aum: 16.0,  vol: 0.016, color: '#4a90e2', etfs: ['QQQ','XLK','SMH','ARKK'] },
  { id: 'health_sector',   name: '醫療生技',      parent: 'us_equities', aum:  7.0,  vol: 0.010, color: '#27ae60', etfs: ['XLV','IBB'] },
  { id: 'fin_sector',      name: '金融',          parent: 'us_equities', aum:  8.0,  vol: 0.013, color: '#8e44ad', etfs: ['XLF','KBE'] },
  { id: 'energy_sector',   name: '能源',          parent: 'us_equities', aum:  3.0,  vol: 0.018, color: '#e67e22', etfs: ['XLE','XOP'] },
  { id: 'cons_disc',       name: '非必需消費',    parent: 'us_equities', aum:  4.0,  vol: 0.014, color: '#e91e8c', etfs: ['XLY'] },
  { id: 'cons_staples',    name: '必需消費',      parent: 'us_equities', aum:  3.0,  vol: 0.008, color: '#9c27b0', etfs: ['XLP'] },
  { id: 'industrial',      name: '工業',          parent: 'us_equities', aum:  3.0,  vol: 0.011, color: '#607d8b', etfs: ['XLI'] },
  { id: 'materials',       name: '材料',          parent: 'us_equities', aum:  1.5,  vol: 0.013, color: '#795548', etfs: ['XLB'] },
  { id: 'utilities',       name: '公用事業',      parent: 'us_equities', aum:  1.5,  vol: 0.009, color: '#00bcd4', etfs: ['XLU'] },
];

export const THEME_ETF: Record<string, string> = {
  '科技': 'XLK', '加密': 'IBIT', '房地產': 'VNQ',
  '能源': 'XLE', '醫療': 'XLV', '金融':   'XLF',
  '消費': 'XLY', '工業': 'XLI', '材料':   'XLB',
  '公用': 'XLU', '債券': 'AGG', '黃金':   'GLD',
  '國際': 'VEA',
};

export const MOCK_EVENTS: MockEvent[] = [
  { date: '2024-03-20', title: 'Fed 維持利率 5.25–5.50%',       type: 'fed',          sectors: ['Bonds','Financials','Utilities'],                   magnitude: 0,  detail: 'FOMC 決議維持利率不變，點陣圖暗示年內 3 次降息。' },
  { date: '2024-05-01', title: 'Fed 暗示降息時間表延後',         type: 'fed',          sectors: ['Bonds','Technology','Real Estate'],                 magnitude: -1, detail: '通膨數據持續頑固，市場降息預期大幅後移，科技股承壓。' },
  { date: '2024-07-11', title: 'CPI 低於預期，降息希望升溫',     type: 'macro',        sectors: ['Bonds','Real Estate','Utilities'],                  magnitude: 2,  detail: '6 月 CPI YoY 3.0%，低於預期，市場押注 9 月降息。' },
  { date: '2024-08-05', title: '日圓套利交易解除，全球股市暴跌', type: 'geopolitical', sectors: ['International','Technology','Crypto'],              magnitude: -3, detail: '日銀升息導致日圓套利交易平倉潮，VIX 飆升至 38。' },
  { date: '2024-09-18', title: 'Fed 首次降息 50bps',             type: 'fed',          sectors: ['Bonds','Real Estate','Financials'],                 magnitude: 2,  detail: '聯準會宣布降息 2 碼，為 4 年來首次降息。' },
  { date: '2024-10-17', title: 'Nvidia Blackwell 晶片量產確認',  type: 'earnings',     sectors: ['Technology'],                                       magnitude: 2,  detail: 'Blackwell GPU 需求爆炸，AI 基礎建設投資持續加速。' },
  { date: '2024-11-06', title: '川普當選美國總統',               type: 'geopolitical', sectors: ['Financials','Energy','Crypto'],                     magnitude: 3,  detail: '共和黨橫掃國會，市場預期減稅＋鬆綁金融監管，金融股大漲。' },
  { date: '2024-12-18', title: 'Fed 降息但點陣圖偏鷹',           type: 'fed',          sectors: ['Bonds','Technology','Real Estate'],                 magnitude: -2, detail: '降息 1 碼但 2025 年預期僅 2 次降息，遠少於市場預期，股市大跌。' },
  { date: '2025-01-20', title: '川普就職，宣布緊急經濟狀態',     type: 'geopolitical', sectors: ['Energy','Commodities','International'],             magnitude: 1,  detail: '宣布對中國、加拿大、墨西哥加徵關稅，能源政策大轉向。' },
  { date: '2025-01-27', title: 'DeepSeek R1 震撼 AI 市場',       type: 'earnings',     sectors: ['Technology','Commodities'],                         magnitude: -2, detail: '中國 DeepSeek 以低成本媲美 GPT-4，Nvidia 單日市值蒸發約 6000 億美元。' },
  { date: '2025-02-19', title: '比特幣突破 $100,000',             type: 'macro',        sectors: ['Crypto'],                                           magnitude: 3,  detail: '機構持續買進 IBIT，比特幣市值超越白銀，加密板塊整體大漲。' },
  { date: '2025-03-04', title: '關稅戰升級，中美貿易緊張',       type: 'geopolitical', sectors: ['International','Materials','Consumer'],             magnitude: -2, detail: '美國宣布對中國商品加徵額外 25% 關稅，供應鏈重組預期升溫。' },
  { date: '2025-04-02', title: '解放日：史上最大規模關稅宣布',   type: 'geopolitical', sectors: ['International','Consumer','Industrials','Materials'], magnitude: -3, detail: '對逾 90 個國家課徵對等關稅，全球股市劇烈震盪。' },
  { date: '2025-04-09', title: '關稅暫停 90 天，市場強彈',       type: 'geopolitical', sectors: ['Technology','Consumer','International'],             magnitude: 3,  detail: '川普宣布對多數國家關稅暫停，納指單日漲逾 12%，史上前三大漲幅之一。' },
  { date: '2025-04-22', title: 'Fed 鮑威爾警告關稅推升通膨',     type: 'fed',          sectors: ['Bonds','Technology'],                               magnitude: -1, detail: '主席強調通膨風險上升，降息時間表更加不確定。' },
  { date: '2025-05-07', title: 'Fed 維持利率不變',               type: 'fed',          sectors: ['Bonds','Real Estate'],                              magnitude: 0,  detail: 'Fed 會後聲明維持謹慎立場，等待更多通膨數據明朗化。' },
];

export const SECTOR_ETFS: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  for (const [sym, info] of Object.entries(ETF_UNIVERSE)) {
    if (sym === 'SPY') continue;
    if (!map[info.sector]) map[info.sector] = [];
    map[info.sector].push(sym);
  }
  return map;
})();

export const TRADING_DAYS_PER_YEAR = 252;

export const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
