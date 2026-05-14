import { NextResponse } from 'next/server';
import { MOCK_EVENTS } from '@/lib/data-engine';

export async function GET() {
  return NextResponse.json(MOCK_EVENTS);
}
