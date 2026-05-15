import { ETF_UNIVERSE } from './constants';
import { generateSeries } from './series';

export interface Quote {
  symbol: string;
  name: string;
  sector: string;
  mcap: number;
  price: number;
  change_1d: number;
  change_5d: number;
  change_1m: number;
  change_3m: number;
  change_6m: number;
  change_1y: number;
  change_ytd: number;
  volume: number;
}

export class QuoteCache {
  private static readonly TTL = 60_000;
  private _data: Quote[] | null = null;
  private _ts = 0;

  get(): Quote[] {
    if (this._data && Date.now() - this._ts < QuoteCache.TTL) {
      return this._data;
    }
    return this._refresh();
  }

  private _refresh(): Quote[] {
    const yearStart = new Date().getUTCFullYear() + '-01-01';
    const result: Quote[] = [];

    for (const sym of Object.keys(ETF_UNIVERSE)) {
      const series = generateSeries(sym, 380);
      if (series.length < 30) continue;

      const n   = series.length;
      const cur = series[n - 1].close;

      const p = (idx: number) =>
        idx >= 0 && idx < n ? series[idx].close : series[0].close;

      const ytdI = series.findIndex(b => b.date >= yearStart);
      const cYtd = ytdI >= 0 ? series[ytdI].close : series[0].close;

      const pct = (a: number, b: number) => Math.round((a / b - 1) * 10000) / 100;

      result.push({
        symbol:     sym,
        name:       ETF_UNIVERSE[sym].name,
        sector:     ETF_UNIVERSE[sym].sector,
        mcap:       ETF_UNIVERSE[sym].mcap,
        price:      Math.round(cur * 100) / 100,
        change_1d:  pct(cur, p(n - 2)),
        change_5d:  pct(cur, p(n - 6)),
        change_1m:  pct(cur, p(n - 22)),
        change_3m:  pct(cur, p(n - 66)),
        change_6m:  pct(cur, p(n - 130)),
        change_1y:  pct(cur, series[0].close),
        change_ytd: pct(cur, cYtd),
        volume:     series[n - 1].volume,
      });
    }

    this._data = result;
    this._ts   = Date.now();
    return result;
  }
}

const _quoteCache = new QuoteCache();

export function getAllQuotes(): Quote[] {
  return _quoteCache.get();
}
