import { NextResponse } from 'next/server';
import { updateIncidentStatus } from '@/lib/db';
import { getRequestToken, verifyHqToken } from '@/lib/tokens';
import type { IncidentStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const incidentStatuses: IncidentStatus[] = ['NEW', 'IN_PROGRESS', 'RESOLVED'];

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!verifyHqToken(getRequestToken(request))) {
      return NextResponse.json({ error: '수정 권한 없음' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const status = body.status as IncidentStatus;

    if (!incidentStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid incident status.' }, { status: 400 });
    }

    const incident = await updateIncidentStatus(id, status);
    return NextResponse.json({ incident, savedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update incident.' },
      { status: 500 }
    );
  }
}
