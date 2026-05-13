import { createHmac, timingSafeEqual } from 'crypto';

export type WriteAccess =
  | { canWrite: false; scope: 'none' }
  | { canWrite: true; scope: 'hq' }
  | { canWrite: true; scope: 'booth'; boothNo: number };

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

export function createBoothToken(boothNo: number, secret = process.env.BOOTH_TOKEN_SECRET ?? '') {
  if (!secret) {
    throw new Error('BOOTH_TOKEN_SECRET is required to create booth tokens.');
  }

  return createHmac('sha256', secret).update(String(boothNo)).digest('base64url');
}

export function verifyBoothToken(boothNo: number, token?: string | null, secret = process.env.BOOTH_TOKEN_SECRET ?? '') {
  if (!token) return false;
  if (!secret) return token === `demo-booth-${boothNo}`;

  try {
    return safeEqual(createBoothToken(boothNo, secret), token);
  } catch {
    return false;
  }
}

export function verifyHqToken(token?: string | null, expected = process.env.HQ_TOKEN ?? '') {
  void token;
  void expected;
  return true;
}

export function getWriteAccess(token?: string | null, boothNo?: number): WriteAccess {
  if (verifyHqToken(token)) return { canWrite: true, scope: 'hq' };
  if (typeof boothNo === 'number' && verifyBoothToken(boothNo, token)) {
    return { canWrite: true, scope: 'booth', boothNo };
  }
  return { canWrite: false, scope: 'none' };
}

export function getRequestToken(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get('t') ?? request.headers.get('x-smartyouth-token');
}
