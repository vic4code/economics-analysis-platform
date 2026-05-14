import { TRADING_DAYS_PER_YEAR } from './constants';

export interface IndexedPoint {
  date: string;
  value: number;
}

export interface StatsResult {
  total_return: number;
  cagr: number;
  sharpe: number;
  max_drawdown: number;
}

export function computeStats(vals: IndexedPoint[]): StatsResult | Record<string, never> {
  if (vals.length < 5) return {};

  const ret  = vals[vals.length - 1].value / 100 - 1;
  const ny   = vals.length / TRADING_DAYS_PER_YEAR;
  const cagr = ny > 0 ? Math.pow(1 + ret, 1 / ny) - 1 : 0;

  const dr   = vals.slice(1).map((v, i) => v.value / vals[i].value - 1);
  const mean = dr.reduce((s, r) => s + r, 0) / dr.length;
  const std  = Math.sqrt(dr.reduce((s, r) => s + (r - mean) ** 2, 0) / dr.length);
  const sharpe = std > 0 ? (mean / std) * Math.sqrt(TRADING_DAYS_PER_YEAR) : 0;

  let peak = vals[0].value;
  let maxDd = 0;
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
