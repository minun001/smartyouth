import { randomUUID } from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { booths as seedBooths, createInitialStatus } from './booths';
import { getProblemReasons } from './problemBooth';
import type {
  Booth,
  BoothStatus,
  BoothWithStatus,
  HelpType,
  Incident,
  IncidentStatus,
  OperationStatus,
  RecentChange,
  StatusPatch
} from './types';

type DataMode = 'supabase' | 'demo';

type DemoStore = {
  booths: Booth[];
  statuses: Map<number, BoothStatus>;
  incidents: Incident[];
  logs: RecentChange[];
};

declare global {
  // eslint-disable-next-line no-var
  var __smartyouthStore: DemoStore | undefined;
}

let supabaseClient: SupabaseClient | null = null;

export function getDataMode(): DataMode {
  return process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? 'supabase' : 'demo';
}

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase env vars are missing.');
  }

  supabaseClient ??= createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  return supabaseClient;
}

function getDemoStore() {
  if (!globalThis.__smartyouthStore) {
    const now = new Date().toISOString();
    globalThis.__smartyouthStore = {
      booths: seedBooths,
      statuses: new Map(seedBooths.map((booth) => [booth.boothNo, createInitialStatus(booth.boothNo, now)])),
      incidents: [],
      logs: []
    };
  }

  return globalThis.__smartyouthStore;
}

function mapBoothRow(row: Record<string, unknown>): Booth {
  return {
    boothNo: Number(row.booth_no),
    name: String(row.name),
    type: row.type as Booth['type'],
    zone: row.zone ? String(row.zone) : undefined,
    x: row.x === null || row.x === undefined ? undefined : Number(row.x),
    y: row.y === null || row.y === undefined ? undefined : Number(row.y)
  };
}

function mapStatusRow(row: Record<string, unknown>): BoothStatus {
  return {
    boothNo: Number(row.booth_no),
    operationStatus: row.operation_status as BoothStatus['operationStatus'],
    congestionLevel: Number(row.congestion_level) as BoothStatus['congestionLevel'],
    waitMinutes: Number(row.wait_minutes) as BoothStatus['waitMinutes'],
    materialStatus: row.material_status as BoothStatus['materialStatus'],
    helpRequested: Boolean(row.help_requested),
    helpType: row.help_type ? (row.help_type as BoothStatus['helpType']) : undefined,
    memo: row.memo ? String(row.memo) : undefined,
    updatedAt: String(row.updated_at)
  };
}

function mapIncidentRow(row: Record<string, unknown>): Incident {
  return {
    id: String(row.id),
    boothNo: Number(row.booth_no),
    type: row.type as HelpType,
    memo: row.memo ? String(row.memo) : undefined,
    status: row.status as IncidentStatus,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function mapLogRow(row: Record<string, unknown>): RecentChange {
  return {
    id: String(row.id),
    boothNo: Number(row.booth_no),
    field: String(row.field),
    oldValue: row.old_value === null || row.old_value === undefined ? undefined : String(row.old_value),
    newValue: row.new_value === null || row.new_value === undefined ? undefined : String(row.new_value),
    source: String(row.source),
    createdAt: String(row.created_at)
  };
}

function toDbStatus(status: BoothStatus) {
  return {
    booth_no: status.boothNo,
    operation_status: status.operationStatus,
    congestion_level: status.congestionLevel,
    wait_minutes: status.waitMinutes,
    material_status: status.materialStatus,
    help_requested: status.helpRequested,
    help_type: status.helpType ?? null,
    memo: status.memo ?? null,
    updated_at: status.updatedAt
  };
}

function valueToString(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  return String(value);
}

function patchKeys(patch: StatusPatch) {
  return Object.keys(patch) as (keyof StatusPatch)[];
}

function applyPatch(current: BoothStatus, patch: StatusPatch, now = new Date().toISOString()) {
  const next: BoothStatus = { ...current, updatedAt: now };

  for (const key of patchKeys(patch)) {
    const value = patch[key];
    if (key === 'operationStatus' && value) next.operationStatus = value as BoothStatus['operationStatus'];
    if (key === 'congestionLevel' && value !== undefined) next.congestionLevel = value as BoothStatus['congestionLevel'];
    if (key === 'waitMinutes' && value !== undefined) next.waitMinutes = value as BoothStatus['waitMinutes'];
    if (key === 'materialStatus' && value) next.materialStatus = value as BoothStatus['materialStatus'];
    if (key === 'helpRequested' && value !== undefined) next.helpRequested = Boolean(value);
    if (key === 'helpType') next.helpType = value as BoothStatus['helpType'];
    if (key === 'memo') next.memo = typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  if (!next.helpRequested) {
    next.helpType = undefined;
  }

  return next;
}

function createLogs(current: BoothStatus, next: BoothStatus, patch: StatusPatch, source: string, createdAt: string) {
  return patchKeys(patch)
    .filter((field) => valueToString(current[field]) !== valueToString(next[field]))
    .map((field) => ({
      id: randomUUID(),
      boothNo: current.boothNo,
      field,
      oldValue: valueToString(current[field]),
      newValue: valueToString(next[field]),
      source,
      createdAt
    }));
}

function joinRows(boothRows: Booth[], statuses: BoothStatus[], incidents: Incident[]): BoothWithStatus[] {
  const statusMap = new Map(statuses.map((status) => [status.boothNo, status]));
  const activeIncidents = incidents.filter((incident) => incident.status !== 'RESOLVED');
  const activeIncidentByBooth = new Map<number, Incident>();

  for (const incident of activeIncidents) {
    if (!activeIncidentByBooth.has(incident.boothNo)) {
      activeIncidentByBooth.set(incident.boothNo, incident);
    }
  }

  return boothRows.map((booth) => {
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

export async function listBooths(): Promise<Booth[]> {
  if (getDataMode() === 'demo') {
    return getDemoStore().booths;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.from('booths').select('*').order('booth_no');
  if (error) throw error;
  return (data ?? []).map(mapBoothRow);
}

export async function listIncidents(): Promise<Incident[]> {
  if (getDataMode() === 'demo') {
    return [...getDemoStore().incidents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.from('incidents').select('*').order('created_at', { ascending: false }).limit(300);
  if (error) throw error;
  return (data ?? []).map(mapIncidentRow);
}

export async function listRecentChanges(limit = 16): Promise<RecentChange[]> {
  if (getDataMode() === 'demo') {
    return getDemoStore().logs.slice(0, limit);
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('booth_status_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(mapLogRow);
}

export async function listBoothsWithStatus(): Promise<BoothWithStatus[]> {
  if (getDataMode() === 'demo') {
    const store = getDemoStore();
    return joinRows(store.booths, [...store.statuses.values()], store.incidents);
  }

  const supabase = getSupabase();
  const [boothResult, statusResult, incidentResult] = await Promise.all([
    supabase.from('booths').select('*').order('booth_no'),
    supabase.from('booth_statuses').select('*'),
    supabase.from('incidents').select('*').order('created_at', { ascending: false }).limit(300)
  ]);

  if (boothResult.error) throw boothResult.error;
  if (statusResult.error) throw statusResult.error;
  if (incidentResult.error) throw incidentResult.error;

  return joinRows(
    (boothResult.data ?? []).map(mapBoothRow),
    (statusResult.data ?? []).map(mapStatusRow),
    (incidentResult.data ?? []).map(mapIncidentRow)
  );
}

export async function getBoothWithStatus(boothNo: number) {
  const booths = await listBoothsWithStatus();
  return booths.find((booth) => booth.boothNo === boothNo);
}

export async function updateBoothStatus(boothNo: number, patch: StatusPatch, source: string) {
  const now = new Date().toISOString();

  if (getDataMode() === 'demo') {
    const store = getDemoStore();
    const current = store.statuses.get(boothNo) ?? createInitialStatus(boothNo, now);
    const next = applyPatch(current, patch, now);
    const logs = createLogs(current, next, patch, source, now);
    store.statuses.set(boothNo, next);
    store.logs.unshift(...logs);
    return next;
  }

  const supabase = getSupabase();
  const { data: currentRow, error: selectError } = await supabase
    .from('booth_statuses')
    .select('*')
    .eq('booth_no', boothNo)
    .maybeSingle();

  if (selectError) throw selectError;

  const current = currentRow ? mapStatusRow(currentRow) : createInitialStatus(boothNo, now);
  const next = applyPatch(current, patch, now);
  const logs = createLogs(current, next, patch, source, now);

  const { data, error } = await supabase
    .from('booth_statuses')
    .upsert(toDbStatus(next), { onConflict: 'booth_no' })
    .select()
    .single();

  if (error) throw error;

  if (logs.length > 0) {
    const { error: logError } = await supabase.from('booth_status_logs').insert(
      logs.map((log) => ({
        id: log.id,
        booth_no: log.boothNo,
        field: log.field,
        old_value: log.oldValue ?? null,
        new_value: log.newValue ?? null,
        source: log.source,
        created_at: log.createdAt
      }))
    );
    if (logError) throw logError;
  }

  return mapStatusRow(data);
}

export async function updateAllBoothOperationStatuses(operationStatus: OperationStatus, source: string) {
  const boothRows = await listBooths();
  return Promise.all(
    boothRows.map((booth) => updateBoothStatus(booth.boothNo, { operationStatus }, source))
  );
}

export async function createOrUpdateIncident(
  boothNo: number,
  type: HelpType,
  memo: string | undefined,
  source: string,
  options?: { forceCreate?: boolean }
) {
  await updateBoothStatus(boothNo, { helpRequested: true, helpType: type, memo }, source);
  const now = new Date().toISOString();

  if (getDataMode() === 'demo') {
    const store = getDemoStore();
    const existing = options?.forceCreate
      ? undefined
      : store.incidents.find(
          (incident) => incident.boothNo === boothNo && incident.type === type && incident.status !== 'RESOLVED'
        );

    if (existing) {
      existing.memo = memo?.trim() || existing.memo;
      existing.status = 'NEW';
      existing.updatedAt = now;
      return existing;
    }

    const incident: Incident = {
      id: randomUUID(),
      boothNo,
      type,
      memo: memo?.trim() || undefined,
      status: 'NEW',
      createdAt: now,
      updatedAt: now
    };
    store.incidents.unshift(incident);
    return incident;
  }

  const supabase = getSupabase();
  const existingRows = options?.forceCreate
    ? []
    : await supabase
        .from('incidents')
        .select('*')
        .eq('booth_no', boothNo)
        .eq('type', type)
        .in('status', ['NEW', 'IN_PROGRESS'])
        .order('created_at', { ascending: false })
        .limit(1);

  if (!Array.isArray(existingRows) && existingRows.error) throw existingRows.error;

  const existing = Array.isArray(existingRows) ? undefined : existingRows.data?.[0];
  if (existing) {
    const { data, error } = await supabase
      .from('incidents')
      .update({ memo: memo?.trim() || existing.memo, status: 'NEW', updated_at: now })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return mapIncidentRow(data);
  }

  const { data, error } = await supabase
    .from('incidents')
    .insert({
      id: randomUUID(),
      booth_no: boothNo,
      type,
      memo: memo?.trim() || null,
      status: 'NEW',
      created_at: now,
      updated_at: now
    })
    .select()
    .single();

  if (error) throw error;
  return mapIncidentRow(data);
}

export async function updateIncidentStatus(id: string, status: IncidentStatus) {
  const now = new Date().toISOString();

  if (getDataMode() === 'demo') {
    const store = getDemoStore();
    const incident = store.incidents.find((item) => item.id === id);
    if (!incident) throw new Error('Incident not found.');

    incident.status = status;
    incident.updatedAt = now;

    if (status === 'RESOLVED') {
      const activeIncident = store.incidents
        .filter((item) => item.boothNo === incident.boothNo && item.status !== 'RESOLVED')
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt))[0];

      if (activeIncident) {
        await updateBoothStatus(
          incident.boothNo,
          {
            helpRequested: true,
            helpType: activeIncident.type,
            memo: activeIncident.memo
          },
          'hq'
        );
      } else {
        await updateBoothStatus(incident.boothNo, { helpRequested: false, helpType: undefined }, 'hq');
      }
    }

    return incident;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('incidents')
    .update({ status, updated_at: now })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  const incident = mapIncidentRow(data);

  if (status === 'RESOLVED') {
    const { data: activeRows, error: activeError } = await supabase
      .from('incidents')
      .select('*')
      .eq('booth_no', incident.boothNo)
      .in('status', ['NEW', 'IN_PROGRESS'])
      .order('updated_at', { ascending: false })
      .limit(1);

    if (activeError) throw activeError;
    const activeIncident = activeRows?.[0] ? mapIncidentRow(activeRows[0]) : undefined;

    if (activeIncident) {
      await updateBoothStatus(
        incident.boothNo,
        {
          helpRequested: true,
          helpType: activeIncident.type,
          memo: activeIncident.memo
        },
        'hq'
      );
    } else {
      await updateBoothStatus(incident.boothNo, { helpRequested: false, helpType: undefined, memo: '' }, 'hq');
    }
  }

  return incident;
}

export async function resetAllHelpRequests() {
  const now = new Date().toISOString();

  if (getDataMode() === 'demo') {
    const store = getDemoStore();
    const clearedCount = store.incidents.length;
    store.incidents = [];
    for (const [boothNo, status] of store.statuses.entries()) {
      if (status.helpRequested || status.helpType || status.memo) {
        store.statuses.set(boothNo, {
          ...status,
          helpRequested: false,
          helpType: undefined,
          memo: undefined,
          updatedAt: now
        });
      }
    }
    return { clearedCount, resetAt: now };
  }

  const supabase = getSupabase();
  const { count, error: countError } = await supabase
    .from('incidents')
    .select('id', { count: 'exact', head: true });
  if (countError) throw countError;

  const { error: deleteError } = await supabase.from('incidents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (deleteError) throw deleteError;

  const { error: statusError } = await supabase
    .from('booth_statuses')
    .update({
      help_requested: false,
      help_type: null,
      memo: null,
      updated_at: now
    })
    .neq('booth_no', -1);
  if (statusError) throw statusError;

  return { clearedCount: count ?? 0, resetAt: now };
}
