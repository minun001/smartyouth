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

  it('resets every HQ-managed demo value to the initial operation state', async () => {
    await patchStaticAllOperationStatuses('demo-hq', 'OPEN');
    await createStaticHelp(1, 'demo-hq', 'ETC', 'reset check');

    expect(getStaticStatus('demo-hq').booths.every((booth) => booth.status.operationStatus === 'OPEN')).toBe(true);
    expect(getStaticStatus('demo-hq').incidents).toHaveLength(1);

    const result = await resetStaticOperations('demo-hq');
    const reset = getStaticStatus('demo-hq');

    expect(result.boothCount).toBe(reset.booths.length);
    expect(reset.booths.every((booth) => booth.status.operationStatus === 'READY')).toBe(true);
    expect(reset.booths.every((booth) => booth.status.congestionLevel === 0)).toBe(true);
    expect(reset.booths.every((booth) => !booth.status.helpRequested)).toBe(true);
    expect(reset.incidents).toHaveLength(0);
    expect(reset.recentChanges).toHaveLength(0);
  });
});
