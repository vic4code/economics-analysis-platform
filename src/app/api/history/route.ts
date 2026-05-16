import { NextResponse } from 'next/server';
import { ETF_UNIVERSE, PERIOD_DAYS, generateSeries } from '@/lib/data-engine';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get('symbol') ?? 'SPY').toUpperCase();
  const period = searchParams.get('period') ?? '1y';

  if (!(symbol in ETF_UNIVERSE)) {
    return NextResponse.json({ error: 'unknown symbol' }, { status: 400 });
  }

  const days = PERIOD_DAYS[period as keyof typeof PERIOD_DAYS] ?? 380;
  const series = await generateSeries(symbol, days);
  return NextResponse.json({ symbol, period, series });
}
