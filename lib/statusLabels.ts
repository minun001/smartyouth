import type {
  BoothType,
  CongestionLevel,
  DashboardFilter,
  HelpType,
  IncidentStatus,
  MaterialStatus,
  OperationStatus
} from './types';

export const operationStatusLabels: Record<OperationStatus, string> = {
  READY: '준비중',
  OPEN: '운영중',
  PAUSED: '잠시중단',
  CLOSED: '마감'
};

export const operationStatusOrder: OperationStatus[] = ['READY', 'OPEN', 'PAUSED', 'CLOSED'];

export const congestionLabels: Record<CongestionLevel, string> = {
  0: '여유',
  1: '보통',
  2: '약간혼잡',
  3: '혼잡',
  4: '매우혼잡'
};

export const congestionColors: Record<CongestionLevel, string> = {
  0: '#22c55e',
  1: '#84cc16',
  2: '#facc15',
  3: '#f97316',
  4: '#ef4444'
};

export const congestionSoftColors: Record<CongestionLevel, string> = {
  0: '#ecfdf5',
  1: '#f7fee7',
  2: '#fefce8',
  3: '#fff7ed',
  4: '#fef2f2'
};

export const congestionLevels: CongestionLevel[] = [0, 1, 2, 3, 4];

export function isCongestedLevel(level: CongestionLevel) {
  return level >= 3;
}

export function congestionStatusLabel(level: CongestionLevel) {
  return isCongestedLevel(level) ? '혼잡' : '여유';
}

export function congestionStatusColor(level: CongestionLevel) {
  return isCongestedLevel(level) ? '#f97316' : '#00b010';
}

export function congestionStatusSoftColor(level: CongestionLevel) {
  return isCongestedLevel(level) ? '#fff7ed' : '#ecfdf5';
}

export const materialStatusLabels: Record<MaterialStatus, string> = {
  OK: '충분',
  LOW: '부족',
  OUT: '소진'
};

export const materialStatusOrder: MaterialStatus[] = ['OK', 'LOW', 'OUT'];

export const helpTypeLabels: Record<HelpType, string> = {
  STAFF: '인력지원',
  MATERIAL: '재료요청',
  EQUIPMENT: '장비문제',
  SAFETY: '안전문제',
  ETC: '기타'
};

export const helpTypeOrder: HelpType[] = ['STAFF', 'MATERIAL', 'EQUIPMENT', 'SAFETY', 'ETC'];

export const incidentStatusLabels: Record<IncidentStatus, string> = {
  NEW: '새 요청',
  IN_PROGRESS: '처리중',
  RESOLVED: '완료'
};

export const boothTypeLabels: Record<BoothType, string> = {
  experience: '체험',
  medical: '의료',
  exchange: '교환',
  hq: '운영본부',
  waiting: '대기실',
  rest: '쉼터'
};

export const filterLabels: Record<DashboardFilter, string> = {
  problem: '문제만',
  all: '전체',
  open: '운영중',
  congested: '혼잡',
  help: '도움요청',
  closed: '마감'
};

export const filterOrder: DashboardFilter[] = ['problem', 'all', 'open', 'congested', 'help', 'closed'];

export function formatTime(value?: string | Date) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul'
  }).format(date);
}

export function formatRelativeUpdatedAt(value: string) {
  const updated = new Date(value).getTime();
  if (Number.isNaN(updated)) return '업데이트 없음';
  const diffMinutes = Math.max(0, Math.floor((Date.now() - updated) / 60000));
  if (diffMinutes < 1) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const hours = Math.floor(diffMinutes / 60);
  return `${hours}시간 전`;
}
