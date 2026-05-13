import { NextResponse } from 'next/server';
import { resetAllHelpRequests } from '@/lib/db';
import { getRequestToken, verifyHqToken } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request) {
  try {
    if (!verifyHqToken(getRequestToken(request))) {
      return NextResponse.json({ error: '요청을 처리할 수 없습니다.' }, { status: 403 });
    }

    const result = await resetAllHelpRequests();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reset help requests.' },
      { status: 500 }
    );
  }
}
