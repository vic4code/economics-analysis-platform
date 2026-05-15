import { ETF_UNIVERSE, SECTOR_DRIFT } from './constants';
import { SeededRandom, seedFor } from './prng';
import { fetchYahooSeries } from './yahoo';

export interface DailySeries {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function generateSeriesMock(symbol: string, days: number): DailySeries[] {
  const info = ETF_UNIVERSE[symbol];
  if (!info) return [];

  const rng   = new SeededRandom(seedFor(symbol));
  const vol   = info.vol;
  const drift = SECTOR_DRIFT[info.sector] ?? 0;

  const raw: number[] = [info.base];
  for (let i = 0; i < days; i++) {
    raw.push(raw[raw.length - 1] * (1 + rng.gauss(drift, vol)));
  }

  const scale = info.base / raw[raw.length - 1];
  for (let i = 0; i < raw.length; i++) raw[i] *= scale;

  const series: DailySeries[] = [];
  const today   = new Date();
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

export async function generateSeries(symbol: string, days: number): Promise<DailySeries[]> {
  const info = ETF_UNIVERSE[symbol];
  if (!info) return [];

  try {
    const data = await fetchYahooSeries(symbol, days);
    if (data.length >= Math.min(days, 20)) return data;
  } catch {
    // fall through to mock
  }
  return generateSeriesMock(symbol, days);
}
