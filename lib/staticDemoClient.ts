'use client';

import { booths, createInitialStatus } from './booths';
import { getProblemReasons } from './problemBooth';
import type {
  BoothStatus,
  BoothWithStatus,
  HelpType,
  Incident,
  IncidentStatus,
  OperationStatus,
  RecentChange,
  StatusPatch
} from './types';

export type ClientStatusResponse = {
  booths: BoothWithStatus[];
  incidents: Incident[];
  recentChanges: RecentChange[];
  access: {
    hq: boolean;
    boothNo: number | null;
    canEditBooth: boolean;
  };
  mode: 'demo' | 'supabase';
  refreshedAt: string;
};

type StaticState = {
  statuses: BoothStatus[];
  incidents: Incident[];
  logs: RecentChange[];
};

const STORAGE_KEY = 'smartyouth-static-demo-state';
const STATIC_PRERENDERED_AT = '2026-05-12T09:00:00.000Z';

function demoBoothToken(boothNo: number) {
  return `demo-booth-${boothNo}`;
}

function id() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createFallbackState(now: string): StaticState {
  return {
    statuses: booths.map((booth) => createInitialStatus(booth.boothNo, now)),
    incidents: [],
    logs: []
  };
}

function readState(now = new Date().toISOString()): StaticState {
  const fallback = createFallbackState(now);

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<StaticState>;
    const statusMap = new Map((parsed.statuses ?? []).map((status) => [status.boothNo, status]));
    return {
      statuses: booths.map((booth) => statusMap.get(booth.boothNo) ?? createInitialStatus(booth.boothNo, now)),
      incidents: parsed.incidents ?? [],
      logs: parsed.logs ?? []
    };
  } catch {
    return fallback;
  }
}

function writeState(state: StaticState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function emitHelpCreated(incident: Incident) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('smartyouth-help-created', { detail: incident }));
}

function valueToString(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  return String(value);
}

function canWrite(token?: string | null, boothNo?: number) {
  const hq = true;
  const booth = typeof boothNo === 'number' && token === demoBoothToken(boothNo);
  return { hq, booth, canEditBooth: hq || booth };
}

function latestActiveIncident(state: StaticState, boothNo: number) {
  return state.incidents
    .filter((incident) => incident.boothNo === boothNo && incident.status !== 'RESOLVED')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt))[0];
}

function syncBoothHelpStatus(state: StaticState, boothNo: number, now: string) {
  const active = latestActiveIncident(state, boothNo);
  const index = state.statuses.findIndex((status) => status.boothNo === boothNo);
  const current = index >= 0 ? state.statuses[index] : createInitialStatus(boothNo, now);
  const next: BoothStatus = active
    ? {
        ...current,
        helpRequested: true,
        helpType: active.type,
        memo: active.memo,
        updatedAt: now
      }
    : {
        ...current,
        helpRequested: false,
        helpType: undefined,
        memo: undefined,
        updatedAt: now
      };

  if (index >= 0) state.statuses[index] = next;
  else state.statuses.push(next);
}

function joinState(state: StaticState): BoothWithStatus[] {
  const statusMap = new Map(state.statuses.map((status) => [status.boothNo, status]));
  const activeIncidentByBooth = new Map<number, Incident>();

  for (const incident of state.incidents.filter((item) => item.status !== 'RESOLVED')) {
    if (!activeIncidentByBooth.has(incident.boothNo)) {
      activeIncidentByBooth.set(incident.boothNo, incident);
    }
  }

  return booths.map((booth) => {
    const status = statusMap.get(booth.boothNo) ?? createInitialStatus(booth.boothNo);
    const problemReasons = getProblemReasons(status);
    return {
      ...booth,
      status,
      problem: problemReasons.length > 0,
      problemReasons,
      activeIncident: activeIncidentByBooth.get(booth.boothNo)
    };
  });
}

export function getStaticStatus(token?: string | null, boothNo?: number): ClientStatusResponse {
  const refreshedAt = new Date().toISOString();
  const state = readState(refreshedAt);
  const access = canWrite(token, boothNo);
  return {
    booths: joinState(state),
    incidents: [...state.incidents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    recentChanges: access.hq ? state.logs.slice(0, 16) : [],
    access: {
      hq: access.hq,
      boothNo: access.booth && boothNo ? boothNo : null,
      canEditBooth: access.canEditBooth
    },
    mode: 'demo',
    refreshedAt
  };
}

export function getInitialStaticStatus(token?: string | null, boothNo?: number): ClientStatusResponse {
  const access = canWrite(token, boothNo);
  return {
    booths: joinState(createFallbackState(STATIC_PRERENDERED_AT)),
    incidents: [],
    recentChanges: [],
    access: {
      hq: access.hq,
      boothNo: access.booth && boothNo ? boothNo : null,
      canEditBooth: access.canEditBooth
    },
    mode: 'demo',
    refreshedAt: STATIC_PRERENDERED_AT
  };
}

export async function patchStaticStatus(boothNo: number, token: string | null | undefined, patch: StatusPatch) {
  const access = canWrite(token, boothNo);
  if (!access.canEditBooth) throw new Error('요청을 처리할 수 없습니다.');

  const state = readState();
  const now = new Date().toISOString();
  const statusIndex = state.statuses.findIndex((status) => status.boothNo === boothNo);
  const current = statusIndex >= 0 ? state.statuses[statusIndex] : createInitialStatus(boothNo, now);
  const next: BoothStatus = {
    ...current,
    ...patch,
    memo: typeof patch.memo === 'string' && patch.memo.trim() ? patch.memo.trim() : current.memo,
    updatedAt: now
  };

  if (!next.helpRequested) {
    next.helpType = undefined;
  }

  const logs = (Object.keys(patch) as (keyof StatusPatch)[])
    .filter((field) => valueToString(current[field]) !== valueToString(next[field]))
    .map((field) => ({
      id: id(),
      boothNo,
      field,
      oldValue: valueToString(current[field]),
      newValue: valueToString(next[field]),
      source: access.hq ? 'static-hq' : `static-booth:${boothNo}`,
      createdAt: now
    }));

  if (statusIndex >= 0) state.statuses[statusIndex] = next;
  else state.statuses.push(next);
  state.logs.unshift(...logs);
  writeState(state);
  return { status: next, savedAt: now };
}

export async function patchStaticAllOperationStatuses(
  token: string | null | undefined,
  operationStatus: OperationStatus
) {
  if (!canWrite(token).hq) throw new Error('요청을 처리할 수 없습니다.');

  const state = readState();
  const now = new Date().toISOString();
  const statusMap = new Map(state.statuses.map((status) => [status.boothNo, status]));
  const logs: RecentChange[] = [];

  state.statuses = booths.map((booth) => {
    const current = statusMap.get(booth.boothNo) ?? createInitialStatus(booth.boothNo, now);
    const next: BoothStatus = {
      ...current,
      operationStatus,
      updatedAt: now
    };

    if (valueToString(current.operationStatus) !== valueToString(next.operationStatus)) {
      logs.push({
        id: id(),
        boothNo: booth.boothNo,
        field: 'operationStatus',
        oldValue: valueToString(current.operationStatus),
        newValue: valueToString(next.operationStatus),
        source: 'static-hq:bulk',
        createdAt: now
      });
    }

    return next;
  });

  state.logs.unshift(...logs);
  writeState(state);
  return { statuses: state.statuses, savedAt: now };
}

export async function resetStaticOperations(token: string | null | undefined) {
  if (!canWrite(token).hq) throw new Error('요청을 처리할 수 없습니다.');

  const now = new Date().toISOString();
  const state = readState(now);
  const clearedHelpCount = state.incidents.length;
  const clearedLogCount = state.logs.length;
  const resetState = createFallbackState(now);

  writeState(resetState);
  window.dispatchEvent(new CustomEvent('smartyouth-help-reset'));
  window.dispatchEvent(new CustomEvent('smartyouth-status-reset'));

  return {
    boothCount: resetState.statuses.length,
    clearedHelpCount,
    clearedLogCount,
    resetAt: now
  };
}

export async function createStaticHelp(
  boothNo: number,
  token: string | null | undefined,
  type: HelpType,
  memo?: string,
  options?: { forceCreate?: boolean }
) {
  const access = canWrite(token, boothNo);
  const state = readState();
  const now = new Date().toISOString();
  const statusIndex = state.statuses.findIndex((status) => status.boothNo === boothNo);
  const current = statusIndex >= 0 ? state.statuses[statusIndex] : createInitialStatus(boothNo, now);
  const next: BoothStatus = {
    ...current,
    helpRequested: true,
    helpType: type,
    memo: memo?.trim() || undefined,
    updatedAt: now
  };
  const patch: StatusPatch = { helpRequested: true, helpType: type, memo };
  const source = access.canEditBooth ? (access.hq ? 'static-hq' : `static-booth:${boothNo}`) : 'static-public-help';
  const logs = (Object.keys(patch) as (keyof StatusPatch)[])
    .filter((field) => valueToString(current[field]) !== valueToString(next[field]))
    .map((field) => ({
      id: id(),
      boothNo,
      field,
      oldValue: valueToString(current[field]),
      newValue: valueToString(next[field]),
      source,
      createdAt: now
    }));

  if (statusIndex >= 0) state.statuses[statusIndex] = next;
  else state.statuses.push(next);
  state.logs.unshift(...logs);

  const existing = options?.forceCreate
    ? undefined
    : state.incidents.find(
        (incident) => incident.boothNo === boothNo && incident.type === type && incident.status !== 'RESOLVED'
      );

  if (existing) {
    existing.status = 'NEW';
    existing.memo = memo?.trim() || existing.memo;
    existing.updatedAt = now;
    syncBoothHelpStatus(state, boothNo, now);
    writeState(state);
    return { incident: existing, savedAt: now };
  }

  const incident: Incident = {
    id: id(),
    boothNo,
    type,
    memo: memo?.trim() || undefined,
    status: 'NEW',
    createdAt: now,
    updatedAt: now
  };
  state.incidents.unshift(incident);
  syncBoothHelpStatus(state, boothNo, now);
  writeState(state);
  emitHelpCreated(incident);
  return { incident, savedAt: now };
}

export async function patchStaticIncident(token: string | null | undefined, incidentId: string, status: IncidentStatus) {
  if (!canWrite(token).hq) throw new Error('요청을 처리할 수 없습니다.');

  const state = readState();
  const now = new Date().toISOString();
  const incident = state.incidents.find((item) => item.id === incidentId);
  if (!incident) throw new Error('Incident not found.');

  incident.status = status;
  incident.updatedAt = now;
  syncBoothHelpStatus(state, incident.boothNo, now);

  writeState(state);
  return { incident, savedAt: now };
}

export async function resetStaticHelpRequests(token: string | null | undefined) {
  if (!canWrite(token).hq) throw new Error('요청을 처리할 수 없습니다.');

  const state = readState();
  const now = new Date().toISOString();
  const clearedCount = state.incidents.length;

  state.incidents = [];
  state.statuses = state.statuses.map((status) =>
    status.helpRequested || status.helpType || status.memo
      ? {
          ...status,
          helpRequested: false,
          helpType: undefined,
          memo: undefined,
          updatedAt: now
        }
      : status
  );

  writeState(state);
  window.dispatchEvent(new CustomEvent('smartyouth-help-reset'));
  return { clearedCount, resetAt: now };
}
