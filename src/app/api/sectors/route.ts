import { NextResponse } from 'next/server';
import { ETF_UNIVERSE, getAllQuotes, Quote } from '@/lib/data-engine';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') ?? '1d';
  const key = `change_${period}` as keyof Quote;

  const sectors: Record<string, {
    sector: string;
    change: number;
    mcap: number;
    etfs: { symbol: string; change: number }[];
  }> = {};

  for (const q of await getAllQuotes()) {
    const sec = q.sector as string;
    if (!(sec in sectors)) {
      sectors[sec] = { sector: sec, change: 0, mcap: 0, etfs: [] };
    }
    sectors[sec].etfs.push({ symbol: q.symbol as string, change: (q[key] as number) ?? 0 });
    sectors[sec].mcap += q.mcap as number;
  }

  for (const data of Object.values(sectors)) {
    const totalM = data.etfs.reduce((sum, e) => {
      return sum + ((ETF_UNIVERSE as Record<string, { mcap: number }>)[e.symbol]?.mcap ?? 0);
    }, 0);
    data.change = totalM
      ? Math.round(
          (data.etfs.reduce((sum, e) => {
            return sum + e.change * ((ETF_UNIVERSE as Record<string, { mcap: number }>)[e.symbol]?.mcap ?? 0);
          }, 0) /
            totalM) *
            100
        ) / 100
      : 0;
  }

  return NextResponse.json(Object.values(sectors));
}
