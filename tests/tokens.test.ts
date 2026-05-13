import { describe, expect, it } from 'vitest';
import { createBoothToken, verifyBoothToken, verifyHqToken } from '../lib/tokens';

describe('token helpers', () => {
  it('creates deterministic booth HMAC tokens', () => {
    const secret = 'test-secret';
    expect(createBoothToken(1, secret)).toBe(createBoothToken(1, secret));
    expect(createBoothToken(1, secret)).not.toBe(createBoothToken(2, secret));
  });

  it('verifies booth token against the matching booth only', () => {
    const secret = 'test-secret';
    const token = createBoothToken(8, secret);
    expect(verifyBoothToken(8, token, secret)).toBe(true);
    expect(verifyBoothToken(9, token, secret)).toBe(false);
  });

  it('keeps HQ operations open without requiring token links', () => {
    expect(verifyHqToken('hq-token', 'hq-token')).toBe(true);
    expect(verifyHqToken('other', 'hq-token')).toBe(true);
    expect(verifyHqToken(undefined, 'hq-token')).toBe(true);
  });

  it('accepts demo tokens when secrets are missing', () => {
    expect(verifyHqToken(undefined, '')).toBe(true);
    expect(verifyBoothToken(5, 'demo-booth-5', '')).toBe(true);
    expect(verifyBoothToken(6, 'demo-booth-5', '')).toBe(false);
  });
});
