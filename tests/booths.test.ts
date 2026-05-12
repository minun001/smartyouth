import { describe, expect, it } from 'vitest';
import { booths } from '../lib/booths';

describe('booth seed data', () => {
  it('includes booth numbers 1-41 and 44 only', () => {
    const boothNumbers = booths.map((booth) => booth.boothNo);
    expect(boothNumbers).toHaveLength(42);
    expect(boothNumbers).toContain(1);
    expect(boothNumbers).toContain(41);
    expect(boothNumbers).toContain(44);
    expect(boothNumbers).not.toContain(42);
    expect(boothNumbers).not.toContain(43);
  });

  it('marks special booth types correctly', () => {
    const byNo = new Map(booths.map((booth) => [booth.boothNo, booth]));
    expect(byNo.get(8)?.type).toBe('medical');
    expect(byNo.get(9)?.type).toBe('rest');
    expect(byNo.get(40)?.type).toBe('exchange');
    expect(byNo.get(41)?.type).toBe('hq');
    expect(byNo.get(44)?.type).toBe('waiting');
  });
});
