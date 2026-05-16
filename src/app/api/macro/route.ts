import { NextResponse } from 'next/server';
import { getMacroData } from '@/lib/data-engine';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') ?? '1d';
  return NextResponse.json(await getMacroData(period));
}
