import { NextResponse } from 'next/server';
import { getAllQuotes } from '@/lib/data-engine';

export async function GET() {
  return NextResponse.json(getAllQuotes());
}
