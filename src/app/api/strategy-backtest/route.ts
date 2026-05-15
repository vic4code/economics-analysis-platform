import { NextResponse } from 'next/server';
import { runStrategyBacktest } from '@/lib/data-engine';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') ?? '1y';
  const topN = parseInt(searchParams.get('top_n') ?? '3', 10);
  return NextResponse.json(runStrategyBacktest(period, topN));
}
