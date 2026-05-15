import { NextResponse } from 'next/server';
import { ETF_UNIVERSE, runBacktest } from '@/lib/data-engine';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawWeights = searchParams.get('weights') ?? 'SPY:1';
  const period = searchParams.get('period') ?? '1y';

  const weights: Record<string, number> = {};
  for (const part of rawWeights.split(',')) {
    if (part.includes(':')) {
      const colonIdx = part.indexOf(':');
      const sym = part.slice(0, colonIdx).trim().toUpperCase();
      const w = parseFloat(part.slice(colonIdx + 1));
      if (sym in ETF_UNIVERSE && !isNaN(w)) {
        weights[sym] = w / 100;
      }
    }
  }

  if (Object.keys(weights).length === 0) {
    return NextResponse.json({ error: 'no valid weights' }, { status: 400 });
  }

  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const normalised: Record<string, number> = {};
  for (const [sym, w] of Object.entries(weights)) {
    normalised[sym] = w / total;
  }

  return NextResponse.json(await runBacktest(normalised, period));
}
