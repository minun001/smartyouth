import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createStaticHelp,
  getStaticStatus,
  patchStaticAllOperationStatuses,
  resetStaticOperations
} from '../lib/staticDemoClient';

const storage = new Map<string, string>();
const dispatchEvent = vi.fn();

class TestCustomEvent<T = unknown> {
  readonly type: string;
  readonly detail?: T;

  constructor(type: string, init?: { detail?: T }) {
    this.type = type;
    this.detail = init?.detail;
  }
}

describe('static demo operation reset', () => {
  beforeEach(() => {
    storage.clear();
    dispatchEvent.mockClear();

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => {
            storage.set(key, value);
          }
        },
        dispatchEvent
      }
    });

    Object.defineProperty(globalThis, 'CustomEvent', {
      configurable: true,
      value: TestCustomEvent
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
    Reflect.deleteProperty(globalThis, 'CustomEvent');
  });

  it('resets every demo value to the initial operation state without a token', async () => {
    await patchStaticAllOperationStatuses(undefined, 'OPEN');
    await createStaticHelp(1, undefined, 'ETC', 'reset check');

    expect(getStaticStatus().booths.every((booth) => booth.status.operationStatus === 'OPEN')).toBe(true);
    expect(getStaticStatus().incidents).toHaveLength(1);

    const result = await resetStaticOperations(undefined);
    const reset = getStaticStatus();

    expect(result.boothCount).toBe(reset.booths.length);
    expect(reset.booths.every((booth) => booth.status.operationStatus === 'READY')).toBe(true);
    expect(reset.booths.every((booth) => booth.status.congestionLevel === 0)).toBe(true);
    expect(reset.booths.every((booth) => !booth.status.helpRequested)).toBe(true);
    expect(reset.incidents).toHaveLength(0);
    expect(reset.recentChanges).toHaveLength(0);
  });

  it('allows public demo help requests without edit tokens', async () => {
    const result = await createStaticHelp(2, undefined, 'MATERIAL', '재료가 부족합니다');
    const status = getStaticStatus();
    const booth = status.booths.find((item) => item.boothNo === 2);

    expect(result.incident.status).toBe('NEW');
    expect(status.incidents).toHaveLength(1);
    expect(status.access.hq).toBe(true);
    expect(status.recentChanges.length).toBeGreaterThan(0);
    expect(booth?.status.helpRequested).toBe(true);
    expect(booth?.status.helpType).toBe('MATERIAL');
  });
});
