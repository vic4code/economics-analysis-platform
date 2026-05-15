import { ETF_UNIVERSE } from './constants';
import { generateSeries } from './series';
import { fetchYahooSnapshots } from './yahoo';

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
  private _inFlight: Promise<Quote[]> | null = null;

  async get(): Promise<Quote[]> {
    if (this._data && Date.now() - this._ts < QuoteCache.TTL) {
      return this._data;
    }
    // Deduplicate concurrent refreshes
    if (this._inFlight) return this._inFlight;
    this._inFlight = this._refresh().finally(() => { this._inFlight = null; });
    return this._inFlight;
  }

  private async _refresh(): Promise<Quote[]> {
    const yearStart = new Date().getUTCFullYear() + '-01-01';
    const symbols   = Object.keys(ETF_UNIVERSE);

    // Fetch all series in parallel + snapshot quotes for intraday accuracy
    const [seriesResults, snapshots] = await Promise.all([
      Promise.all(symbols.map(sym => generateSeries(sym, 380).catch(() => []))),
      fetchYahooSnapshots().catch(() => new Map()),
    ]);

    const result: Quote[] = [];

    for (let i = 0; i < symbols.length; i++) {
      const sym    = symbols[i];
      const series = seriesResults[i];
      if (series.length < 30) continue;

      const n   = series.length;
      const cur = series[n - 1].close;

      const p = (idx: number) =>
        idx >= 0 && idx < n ? series[idx].close : series[0].close;

      const ytdI = series.findIndex(b => b.date >= yearStart);
      const cYtd = ytdI >= 0 ? series[ytdI].close : series[0].close;

      const snap = snapshots.get(sym);
      // Use snapshot price as base so all period returns reflect today's intraday price
      const basePrice = snap?.price ?? Math.round(cur * 100) / 100;
      const pct = (past: number) => Math.round((basePrice / past - 1) * 10000) / 100;

      result.push({
        symbol:     sym,
        name:       ETF_UNIVERSE[sym].name,
        sector:     ETF_UNIVERSE[sym].sector,
        mcap:       snap?.mcap      ?? ETF_UNIVERSE[sym].mcap,
        price:      basePrice,
        change_1d:  snap?.change_1d ?? pct(p(n - 2)),
        change_5d:  pct(p(n - 6)),
        change_1m:  pct(p(n - 22)),
        change_3m:  pct(p(n - 66)),
        change_6m:  pct(p(n - 130)),
        change_1y:  pct(series[0].close),
        change_ytd: pct(cYtd),
        volume:     snap?.volume    ?? series[n - 1].volume,
      });
    }

    this._data = result;
    this._ts   = Date.now();
    return result;
  }
}

const _quoteCache = new QuoteCache();

export async function getAllQuotes(): Promise<Quote[]> {
  return _quoteCache.get();
}
