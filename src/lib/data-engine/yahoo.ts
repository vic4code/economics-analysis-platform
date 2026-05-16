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
const SERIES_TTL = 3_600_000; // 1 hour (was 24h — stale data caused "wrong numbers")

function r2(n: number) { return Math.round(n * 100) / 100; }
function r1(n: number) { return Math.round(n * 10) / 10; }

// Simple concurrency limiter — max 5 Yahoo requests at once to avoid rate limiting
let _activeRequests = 0;
const _queue: Array<() => void> = [];
const MAX_CONCURRENT = 5;

function acquireSlot(): Promise<void> {
  if (_activeRequests < MAX_CONCURRENT) {
    _activeRequests++;
    return Promise.resolve();
  }
  return new Promise(resolve => _queue.push(resolve));
}

function releaseSlot() {
  const next = _queue.shift();
  if (next) {
    next(); // passes slot to next waiter without decrementing
  } else {
    _activeRequests--;
  }
}

export async function fetchYahooSeries(symbol: string, days: number): Promise<DailySeries[]> {
  const hit = _seriesCache.get(symbol);
  if (hit && Date.now() - hit.ts < SERIES_TTL && hit.data.length >= days) {
    return hit.data.slice(-days);
  }

  await acquireSlot();
  try {
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
        close:  r2(r.adjClose ?? r.close),
        volume: r.volume ?? 0,
      }));

    if (data.length >= 20) _seriesCache.set(symbol, { data, ts: Date.now() });
    return data.slice(-days);
  } finally {
    releaseSlot();
  }
}

export type SnapQuote = Pick<Quote, 'price' | 'change_1d' | 'volume' | 'mcap'>;

// Snapshot cache — 30s TTL for near-real-time prices
let _snapshotCache: { data: Map<string, SnapQuote>; ts: number } | null = null;
const SNAPSHOT_TTL = 30_000;

export async function fetchYahooSnapshots(): Promise<Map<string, SnapQuote>> {
  if (_snapshotCache && Date.now() - _snapshotCache.ts < SNAPSHOT_TTL) {
    return _snapshotCache.data;
  }

  const symbols = Object.keys(ETF_UNIVERSE);
  // Single batch call — Yahoo accepts up to ~100 symbols at once
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

  _snapshotCache = { data: out, ts: Date.now() };
  return out;
}
