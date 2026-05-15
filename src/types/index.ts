// Matches the Quote type from src/lib/data-engine
export interface Quote {
  symbol: string; name: string; sector: string; mcap: number;
  price: number;
  change_1d: number; change_5d: number; change_1m: number;
  change_3m: number; change_6m: number; change_1y: number; change_ytd: number;
  volume: number;
}

export interface MacroNode {
  id: string; name: string; aum: number; change: number;
  color: string; etfs: string[];
  etf_quotes: { symbol: string; name: string; price: number; change: number }[];
  children: MacroNode[];
}

export interface MockEvent {
  date: string; title: string; type: 'fed' | 'macro' | 'geopolitical' | 'earnings';
  sectors: string[]; magnitude: number; detail: string;
}

export interface CycleRow {
  sector: string; color: string;
  monthly_returns: Record<string, number>;
  percentile_rank: number; current_1y: number;
  best_months: string[]; worst_months: string[];
}

export interface ChipRow {
  sector: string;
  dates: string[];
  institutional: number[]; smart_money: number[]; retail: number[];
  cumulative: number[];
  flow_score: number;
}

export interface FlowMatrix {
  sectors: string[]; flow_scores: number[]; volume_ratios: number[];
  mcaps: number[]; rotation_matrix: number[][];
}

export interface DailySeries {
  date: string; open: number; high: number; low: number;
  close: number; volume: number;
}

export type Period = '1d' | '5d' | '1m' | '3m' | '6m' | '1y' | 'ytd';

export const TEMPLATES: Record<string, Record<string, number>> = {
  aggressive: {QQQ:25, SMH:20, IBIT:15, XLE:10, XLF:10, XLY:10, EEM:10},
  balanced:   {QQQ:20, GLD:10, AGG:15, VNQ:15, EEM:10, XLE:10, XLV:10, TLT:10},
  defensive:  {AGG:30, TLT:20, XLP:15, XLU:10, GLD:15, VNQ:10},
  crypto:     {IBIT:50, BITO:30, QQQ:10, ARKK:10},
};
