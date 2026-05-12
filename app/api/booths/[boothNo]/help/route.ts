import { NextResponse } from 'next/server';
import { createOrUpdateIncident, getBoothWithStatus } from '@/lib/db';
import { getRequestToken, getWriteAccess } from '@/lib/tokens';
import type { HelpType } from '@/lib/types';

export const dynamic = 'force-dynamic';

const helpTypes: HelpType[] = ['STAFF', 'MATERIAL', 'EQUIPMENT', 'SAFETY', 'ETC'];

export async function POST(request: Request, context: { params: Promise<{ boothNo: string }> }) {
  try {
    const { boothNo: boothNoParam } = await context.params;
    const boothNo = Number(boothNoParam);
    if (!Number.isInteger(boothNo)) {
      return NextResponse.json({ error: 'Invalid booth number.' }, { status: 400 });
    }

    const access = getWriteAccess(getRequestToken(request), boothNo);
    if (!access.canWrite) {
      return NextResponse.json({ error: '수정 권한 없음' }, { status: 403 });
    }

    const booth = await getBoothWithStatus(boothNo);
    if (!booth) {
      return NextResponse.json({ error: 'Booth not found.' }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const type = body.type as HelpType;
    if (!helpTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid help type.' }, { status: 400 });
    }

    const memo = typeof body.memo === 'string' ? body.memo.slice(0, 300) : undefined;
    const incident = await createOrUpdateIncident(
      boothNo,
      type,
      memo,
      access.scope === 'hq' ? 'hq' : `booth:${boothNo}`
    );
    return NextResponse.json({ incident, savedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to request help.' },
      { status: 500 }
    );
  }
}
