import type { BoothStatus } from './types';
import { congestionStatusLabel, materialStatusLabels, operationStatusLabels } from './statusLabels';

const THIRTY_MINUTES = 30 * 60 * 1000;

export function getProblemReasons(status: BoothStatus, now = new Date(), eventActive = true) {
  const reasons: string[] = [];

  if (status.congestionLevel >= 3) {
    reasons.push(congestionStatusLabel(status.congestionLevel));
  }

  if (status.operationStatus === 'PAUSED') {
    reasons.push(operationStatusLabels.PAUSED);
  }

  if (status.materialStatus === 'LOW' || status.materialStatus === 'OUT') {
    reasons.push(materialStatusLabels[status.materialStatus]);
  }

  if (status.helpRequested) {
    reasons.push('도움요청');
  }

  const updatedAt = new Date(status.updatedAt).getTime();
  if (eventActive && Number.isFinite(updatedAt) && now.getTime() - updatedAt > THIRTY_MINUTES) {
    reasons.push('30분 미업데이트');
  }

  return reasons;
}

export function isProblemBooth(status: BoothStatus, now = new Date(), eventActive = true) {
  return getProblemReasons(status, now, eventActive).length > 0;
}
