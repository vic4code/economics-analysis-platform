import { NextResponse } from 'next/server';
import { getCrisisData } from '@/lib/data-engine';

export async function GET() {
  return NextResponse.json(getCrisisData());
}
