import { NextResponse } from 'next/server';
import { getBoothWithStatus, updateBoothStatus } from '@/lib/db';
import { getRequestToken, getWriteAccess } from '@/lib/tokens';
import type { CongestionLevel, MaterialStatus, OperationStatus, StatusPatch } from '@/lib/types';

export const dynamic = 'force-dynamic';

const operationStatuses: OperationStatus[] = ['READY', 'OPEN', 'PAUSED', 'CLOSED'];
const materialStatuses: MaterialStatus[] = ['OK', 'LOW', 'OUT'];
const congestionLevels: CongestionLevel[] = [0, 1, 2, 3, 4];
const waitMinutes = [0, 5, 10, 20, 30] as const;

function normalizePatch(body: Record<string, unknown>): StatusPatch {
  const patch: StatusPatch = {};

  if (typeof body.operationStatus === 'string' && operationStatuses.includes(body.operationStatus as OperationStatus)) {
    patch.operationStatus = body.operationStatus as OperationStatus;
  }

  if (typeof body.congestionLevel === 'number' && congestionLevels.includes(body.congestionLevel as CongestionLevel)) {
    patch.congestionLevel = body.congestionLevel as CongestionLevel;
  }

  if (typeof body.waitMinutes === 'number' && waitMinutes.includes(body.waitMinutes as (typeof waitMinutes)[number])) {
    patch.waitMinutes = body.waitMinutes as StatusPatch['waitMinutes'];
  }

  if (typeof body.materialStatus === 'string' && materialStatuses.includes(body.materialStatus as MaterialStatus)) {
    patch.materialStatus = body.materialStatus as MaterialStatus;
  }

  if (typeof body.memo === 'string') {
    patch.memo = body.memo.slice(0, 300);
  }

  return patch;
}

export async function PATCH(request: Request, context: { params: Promise<{ boothNo: string }> }) {
  try {
    const { boothNo: boothNoParam } = await context.params;
    const boothNo = Number(boothNoParam);
    if (!Number.isInteger(boothNo)) {
      return NextResponse.json({ error: 'Invalid booth number.' }, { status: 400 });
    }

    const access = getWriteAccess(getRequestToken(request), boothNo);
    if (!access.canWrite) {
      return NextResponse.json({ error: '요청을 처리할 수 없습니다.' }, { status: 403 });
    }

    const booth = await getBoothWithStatus(boothNo);
    if (!booth) {
      return NextResponse.json({ error: 'Booth not found.' }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const patch = normalizePatch(body);
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ status: booth.status });
    }

    const status = await updateBoothStatus(boothNo, patch, access.scope === 'hq' ? 'hq' : `booth:${boothNo}`);
    return NextResponse.json({ status, savedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update status.' },
      { status: 500 }
    );
  }
}
