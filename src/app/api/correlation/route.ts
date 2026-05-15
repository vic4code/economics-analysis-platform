import { NextResponse } from 'next/server';
import { getCorrelationData } from '@/lib/data-engine';

export async function GET() {
  return NextResponse.json(getCorrelationData());
}
