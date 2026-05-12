import { describe, expect, it } from 'vitest';
import { createInitialStatus } from '../lib/booths';
import { getProblemReasons, isProblemBooth } from '../lib/problemBooth';

describe('problem booth detection', () => {
  it('flags high congestion', () => {
    const status = { ...createInitialStatus(1), congestionLevel: 3 as const };
    expect(isProblemBooth(status)).toBe(true);
    expect(getProblemReasons(status)).toContain('혼잡');
  });

  it('flags low material and paused status', () => {
    const status = { ...createInitialStatus(1), materialStatus: 'LOW' as const, operationStatus: 'PAUSED' as const };
    expect(getProblemReasons(status)).toEqual(expect.arrayContaining(['재료 부족', '잠시중단']));
  });

  it('does not flag a fresh ready booth', () => {
    expect(isProblemBooth(createInitialStatus(1))).toBe(false);
  });
});
