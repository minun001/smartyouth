export type OperationStatus = 'READY' | 'OPEN' | 'PAUSED' | 'CLOSED';
export type CongestionLevel = 0 | 1 | 2 | 3 | 4;
export type MaterialStatus = 'OK' | 'LOW' | 'OUT';
export type BoothType = 'experience' | 'medical' | 'exchange' | 'hq' | 'waiting' | 'rest';
export type HelpType = 'STAFF' | 'MATERIAL' | 'EQUIPMENT' | 'SAFETY' | 'ETC';

export type Booth = {
  boothNo: number;
  name: string;
  type: BoothType;
  zone?: string;
  isStampTarget?: boolean;
  x?: number;
  y?: number;
};

export type BoothStatus = {
  boothNo: number;
  operationStatus: OperationStatus;
  congestionLevel: CongestionLevel;
  waitMinutes: 0 | 5 | 10 | 20 | 30;
  materialStatus: MaterialStatus;
  helpRequested: boolean;
  helpType?: HelpType;
  memo?: string;
  updatedAt: string;
};

export type IncidentStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED';

export type Incident = {
  id: string;
  boothNo: number;
  type: HelpType;
  memo?: string;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
};

export type BoothWithStatus = Booth & {
  status: BoothStatus;
  problem: boolean;
  problemReasons: string[];
  activeIncident?: Incident;
};

export type RecentChange = {
  id: string;
  boothNo: number;
  field: string;
  oldValue?: string;
  newValue?: string;
  source: string;
  createdAt: string;
};

export type DashboardFilter = 'problem' | 'all' | 'open' | 'congested' | 'help' | 'closed';

export type StatusPatch = Partial<
  Pick<
    BoothStatus,
    | 'operationStatus'
    | 'congestionLevel'
    | 'waitMinutes'
    | 'materialStatus'
    | 'helpRequested'
    | 'helpType'
    | 'memo'
  >
>;
