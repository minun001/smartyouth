import { describe, expect, it } from 'vitest';
import {
  congestionStatusColor,
  operationStatusColor,
  situationColors,
  situationStatusColor
} from '../lib/statusLabels';

describe('situation status colors', () => {
  it('maps operation statuses to the shared situation palette', () => {
    expect(operationStatusColor('READY')).toBe(situationColors.normal);
    expect(operationStatusColor('OPEN')).toBe(situationColors.open);
    expect(operationStatusColor('PAUSED')).toBe(situationColors.attention);
    expect(operationStatusColor('CLOSED')).toBe(situationColors.closed);
  });

  it('uses attention orange for paused or congested booths', () => {
    expect(situationStatusColor('READY', 0)).toBe(situationColors.normal);
    expect(situationStatusColor('OPEN', 0)).toBe(situationColors.open);
    expect(situationStatusColor('OPEN', 3)).toBe(situationColors.attention);
    expect(situationStatusColor('PAUSED', 0)).toBe(situationColors.attention);
    expect(situationStatusColor('CLOSED', 4)).toBe(situationColors.closed);
  });

  it('uses the same binary colors for congestion labels', () => {
    expect(congestionStatusColor(0)).toBe(situationColors.open);
    expect(congestionStatusColor(2)).toBe(situationColors.open);
    expect(congestionStatusColor(3)).toBe(situationColors.attention);
    expect(congestionStatusColor(4)).toBe(situationColors.attention);
  });
});
