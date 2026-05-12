import { NextResponse } from 'next/server';
import {
  getDataMode,
  listBoothsWithStatus,
  listIncidents,
  listRecentChanges,
  resetAllOperations,
  updateAllBoothOperationStatuses
} from '@/lib/db';
import { getRequestToken, verifyBoothToken, verifyHqToken } from '@/lib/tokens';
import type { OperationStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const bulkOperationStatuses: OperationStatus[] = ['OPEN', 'CLOSED'];

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

export async function PATCH(request: Request) {
  try {
    const token = getRequestToken(request);
    if (!verifyHqToken(token)) {
      return NextResponse.json({ error: 'HQ token is required.' }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const operationStatus = body.operationStatus as OperationStatus;
    if (!bulkOperationStatuses.includes(operationStatus)) {
      return NextResponse.json({ error: 'Invalid operation status.' }, { status: 400 });
    }

    const statuses = await updateAllBoothOperationStatuses(operationStatus, 'hq:bulk');
    return NextResponse.json({ statuses, savedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update all statuses.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const token = getRequestToken(request);
    if (!verifyHqToken(token)) {
      return NextResponse.json({ error: 'HQ token is required.' }, { status: 403 });
    }

    const result = await resetAllOperations();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reset operations.' },
      { status: 500 }
    );
  }
}
