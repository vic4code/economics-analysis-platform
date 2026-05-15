import yahooFinance from 'yahoo-finance2';
import { ETF_UNIVERSE } from './constants';
import type { DailySeries } from './series';
import type { Quote } from './quotes';

// Minimal shapes we extract from yahoo-finance2 responses
interface YFBar {
  date: Date;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close: number;
  adjClose?: number | null;
  volume?: number | null;
}

interface YFQuote {
  symbol?: string | null;
  regularMarketPrice?: number | null;
  regularMarketChangePercent?: number | null;
  regularMarketVolume?: number | null;
  marketCap?: number | null;
}

interface CacheEntry { data: DailySeries[]; ts: number }
const _seriesCache = new Map<string, CacheEntry>();
const SERIES_TTL = 86_400_000; // 24 hours

function r2(n: number) { return Math.round(n * 100) / 100; }
function r1(n: number) { return Math.round(n * 10) / 10; }

export async function fetchYahooSeries(symbol: string, days: number): Promise<DailySeries[]> {
  const hit = _seriesCache.get(symbol);
  if (hit && Date.now() - hit.ts < SERIES_TTL && hit.data.length >= days) {
    return hit.data.slice(-days);
  }

  // Fetch enough days to cover both the requested range and future quote computations.
  const fetchDays = Math.max(days, 400);
  const end   = new Date();
  const start = new Date(end.getTime() - (fetchDays + 30) * 86_400_000);

  const raw = await yahooFinance.historical(
    symbol,
    { period1: start, period2: end, interval: '1d' },
    { validateResult: false },
  );
  const rows = raw as unknown as YFBar[];

  const data: DailySeries[] = rows
    .filter(r => r.close != null)
    .map(r => ({
      date:   r.date.toISOString().slice(0, 10),
      open:   r2(r.open   ?? r.close),
      high:   r2(r.high   ?? r.close),
      low:    r2(r.low    ?? r.close),
      close:  r2(r.adjClose ?? r.close),  // adjusted close for accurate returns
      volume: r.volume ?? 0,
    }));

  if (data.length >= 20) _seriesCache.set(symbol, { data, ts: Date.now() });
  return data.slice(-days);
}

export type SnapQuote = Pick<Quote, 'price' | 'change_1d' | 'volume' | 'mcap'>;

export async function fetchYahooSnapshots(): Promise<Map<string, SnapQuote>> {
  const symbols = Object.keys(ETF_UNIVERSE);
  const raw = await yahooFinance.quote(symbols, {}, { validateResult: false });
  const arr = (Array.isArray(raw) ? raw : [raw]) as unknown as YFQuote[];
  const out = new Map<string, SnapQuote>();

  for (const q of arr) {
    if (!q.symbol || !q.regularMarketPrice) continue;
    out.set(q.symbol, {
      price:     r2(q.regularMarketPrice),
      change_1d: r2(q.regularMarketChangePercent ?? 0),
      volume:    q.regularMarketVolume ?? 0,
      mcap:      q.marketCap
        ? r1(q.marketCap / 1e9)
        : (ETF_UNIVERSE[q.symbol]?.mcap ?? 0),
    });
  }
  return out;
}
