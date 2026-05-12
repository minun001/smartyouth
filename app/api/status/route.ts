import { NextResponse } from 'next/server';
import { getDataMode, listBoothsWithStatus, listIncidents, listRecentChanges } from '@/lib/db';
import { getRequestToken, verifyBoothToken, verifyHqToken } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = getRequestToken(request);
    const boothNo = Number(url.searchParams.get('boothNo'));
    const hq = verifyHqToken(token);
    const canEditBooth = Number.isFinite(boothNo) ? verifyBoothToken(boothNo, token) || hq : false;

    const [booths, incidents, recentChanges] = await Promise.all([
      listBoothsWithStatus(),
      listIncidents(),
      hq ? listRecentChanges() : Promise.resolve([])
    ]);

    return NextResponse.json({
      booths,
      incidents,
      recentChanges,
      access: {
        hq,
        boothNo: canEditBooth && !hq ? boothNo : null,
        canEditBooth
      },
      mode: getDataMode(),
      refreshedAt: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load status.' },
      { status: 500 }
    );
  }
}
