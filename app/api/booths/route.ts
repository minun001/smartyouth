import { NextResponse } from 'next/server';
import { getDataMode, listBooths } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const booths = await listBooths();
    return NextResponse.json({
      booths,
      mode: getDataMode(),
      count: booths.length
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load booths.' },
      { status: 500 }
    );
  }
}
