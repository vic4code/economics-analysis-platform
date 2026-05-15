import { NextResponse } from 'next/server';
import { getCycleData } from '@/lib/data-engine';

export async function GET() {
  return NextResponse.json(getCycleData());
}
