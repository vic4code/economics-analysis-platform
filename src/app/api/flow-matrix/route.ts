import { NextResponse } from 'next/server';
import { getFlowMatrix } from '@/lib/data-engine';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') ?? '1m';
  return NextResponse.json(await getFlowMatrix(period));
}
