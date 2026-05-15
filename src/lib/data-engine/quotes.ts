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
  private static readonly TTL = 30_000; // 30s — match snapshot TTL
  private _data: Quote[] | null = null;
  private _ts = 0;
  private _inFlight: Promise<Quote[]> | null = null;

  async get(): Promise<Quote[]> {
    if (this._data && Date.now() - this._ts < QuoteCache.TTL) {
      return this._data;
    }
    if (this._inFlight) return this._inFlight;
    this._inFlight = this._refresh().finally(() => { this._inFlight = null; });
    return this._inFlight;
  }

  private async _refresh(): Promise<Quote[]> {
    const yearStart = new Date().getUTCFullYear() + '-01-01';
    const symbols   = Object.keys(ETF_UNIVERSE);

    // Snapshots: single batch call — most reliable, gives us price + change_1d
    const snapshots = await fetchYahooSnapshots().catch(() => new Map<string, ReturnType<typeof Map.prototype.get>>());

    // Historical series for period returns — use concurrency limiter in yahoo.ts
    // Fetch with a grace period so quote response isn't blocked waiting for all history
    const seriesResults = await Promise.all(
      symbols.map(sym => generateSeries(sym, 400).catch(() => [] as import('./series').DailySeries[])),
    );

    const result: Quote[] = [];

    for (let i = 0; i < symbols.length; i++) {
      const sym    = symbols[i];
      const series = seriesResults[i];
      const snap   = snapshots.get(sym) as { price: number; change_1d: number; volume: number; mcap: number } | undefined;

      // If we have neither snapshot nor meaningful history, skip
      if (!snap && series.length < 5) continue;

      // Price: always prefer the live snapshot (real-time / 15-min delayed)
      const livePrice = snap?.price;

      if (livePrice && series.length < 5) {
        // Only snapshot available — use it with zeros for period returns
        result.push({
          symbol:     sym,
          name:       ETF_UNIVERSE[sym].name,
          sector:     ETF_UNIVERSE[sym].sector,
          mcap:       snap?.mcap ?? ETF_UNIVERSE[sym].mcap,
          price:      livePrice,
          change_1d:  snap?.change_1d ?? 0,
          change_5d:  0,
          change_1m:  0,
          change_3m:  0,
          change_6m:  0,
          change_1y:  0,
          change_ytd: 0,
          volume:     snap?.volume ?? 0,
        });
        continue;
      }

      const n = series.length;
      const p = (idx: number) => idx >= 0 && idx < n ? series[idx].close : series[0].close;
      const ytdI = series.findIndex(b => b.date >= yearStart);
      const cYtd = ytdI >= 0 ? series[ytdI].close : series[0].close;

      // Use snapshot price as the base (live price), fall back to last close
      const basePrice = livePrice ?? (Math.round(series[n - 1].close * 100) / 100);
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
