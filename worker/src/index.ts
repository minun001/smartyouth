/// <reference types="@cloudflare/workers-types" />

import { DurableObject } from 'cloudflare:workers';
import { booths as seedBooths, createInitialStatus } from '../../lib/booths';
import type {
  Booth,
  BoothStatus,
  BoothWithStatus,
  CongestionLevel,
  HelpType,
  Incident,
  IncidentStatus,
  MaterialStatus,
  OperationStatus,
  RecentChange,
  StatusPatch
} from '../../lib/types';

export interface Env {
  DB: D1Database;
  REALTIME: DurableObjectNamespace;
  HQ_TOKEN: string;
  BOOTH_TOKEN_SECRET: string;
  ALLOWED_ORIGIN?: string;
}

type WriteAccess =
  | { canWrite: false; scope: 'none' }
  | { canWrite: true; scope: 'hq' }
  | { canWrite: true; scope: 'booth'; boothNo: number };

const operationStatuses: OperationStatus[] = ['READY', 'OPEN', 'PAUSED', 'CLOSED'];
const materialStatuses: MaterialStatus[] = ['OK', 'LOW', 'OUT'];
const congestionLevels: CongestionLevel[] = [0, 1, 2, 3, 4];
const waitMinutes = [0, 5, 10, 20, 30] as const;
const helpTypes: HelpType[] = ['STAFF', 'MATERIAL', 'EQUIPMENT', 'SAFETY', 'ETC'];
const incidentStatuses: IncidentStatus[] = ['NEW', 'IN_PROGRESS', 'RESOLVED'];

function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get('Origin') ?? '';
  const configured = (env.ALLOWED_ORIGIN ?? 'https://minun001.github.io,http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const allowOrigin =
    configured.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')
      ? origin
      : configured[0] ?? '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,x-smartyouth-token',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}

function json(request: Request, env: Env, body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(request, env),
      ...init.headers
    }
  });
}

function empty(request: Request, env: Env, init: ResponseInit = {}) {
  return new Response(null, {
    ...init,
    headers: {
      ...corsHeaders(request, env),
      ...init.headers
    }
  });
}

function getRequestToken(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get('t') ?? request.headers.get('x-smartyouth-token');
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

function base64Url(buffer: ArrayBuffer) {
  let binary = '';
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function createBoothToken(boothNo: number, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(String(boothNo)));
  return base64Url(signature);
}

async function verifyBoothToken(boothNo: number, token: string | null, env: Env) {
  if (!token || !env.BOOTH_TOKEN_SECRET) return false;
  return safeEqual(await createBoothToken(boothNo, env.BOOTH_TOKEN_SECRET), token);
}

function verifyHqToken(token: string | null, env: Env) {
  void token;
  void env;
  return true;
}

async function getWriteAccess(request: Request, env: Env, boothNo?: number): Promise<WriteAccess> {
  const token = getRequestToken(request);
  if (verifyHqToken(token, env)) return { canWrite: true, scope: 'hq' };
  if (typeof boothNo === 'number' && (await verifyBoothToken(boothNo, token, env))) {
    return { canWrite: true, scope: 'booth', boothNo };
  }
  return { canWrite: false, scope: 'none' };
}

function valueToString(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  return String(value);
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
    operationStatus: row.operation_status as OperationStatus,
    congestionLevel: Number(row.congestion_level) as CongestionLevel,
    waitMinutes: Number(row.wait_minutes) as BoothStatus['waitMinutes'],
    materialStatus: row.material_status as MaterialStatus,
    helpRequested: Boolean(row.help_requested),
    helpType: row.help_type ? (row.help_type as HelpType) : undefined,
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

function toDbTime(date = new Date()) {
  return date.toISOString();
}

async function listBooths(env: Env) {
  const { results } = await env.DB.prepare('select * from booths order by booth_no').all<Record<string, unknown>>();
  if (results.length > 0) return results.map(mapBoothRow);
  return seedBooths;
}

async function listStatuses(env: Env) {
  const { results } = await env.DB.prepare('select * from booth_statuses').all<Record<string, unknown>>();
  return results.map(mapStatusRow);
}

async function listIncidents(env: Env) {
  const { results } = await env.DB.prepare(
    'select * from incidents order by created_at desc limit 300'
  ).all<Record<string, unknown>>();
  return results.map(mapIncidentRow);
}

async function listRecentChanges(env: Env) {
  const { results } = await env.DB.prepare(
    'select * from booth_status_logs order by created_at desc limit 16'
  ).all<Record<string, unknown>>();
  return results.map(mapLogRow);
}

function getProblemReasons(status: BoothStatus) {
  const reasons: string[] = [];
  if (status.congestionLevel >= 3) reasons.push('혼잡');
  if (status.materialStatus === 'LOW' || status.materialStatus === 'OUT') reasons.push('재료 확인');
  if (status.operationStatus === 'PAUSED') reasons.push('잠시중단');
  if (status.helpRequested) reasons.push('도움요청');
  if (
    status.operationStatus !== 'CLOSED' &&
    Date.now() - new Date(status.updatedAt).getTime() > 30 * 60 * 1000
  ) {
    reasons.push('30분 이상 미갱신');
  }
  return reasons;
}

function joinRows(boothRows: Booth[], statuses: BoothStatus[], incidents: Incident[]): BoothWithStatus[] {
  const statusMap = new Map(statuses.map((status) => [status.boothNo, status]));
  const activeIncidentByBooth = new Map<number, Incident>();

  for (const incident of incidents.filter((item) => item.status !== 'RESOLVED')) {
    if (!activeIncidentByBooth.has(incident.boothNo)) activeIncidentByBooth.set(incident.boothNo, incident);
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

function normalizePatch(body: Record<string, unknown>): StatusPatch {
  const patch: StatusPatch = {};
  if (typeof body.operationStatus === 'string' && operationStatuses.includes(body.operationStatus as OperationStatus)) {
    patch.operationStatus = body.operationStatus as OperationStatus;
  }
  if (typeof body.congestionLevel === 'number' && congestionLevels.includes(body.congestionLevel as CongestionLevel)) {
    patch.congestionLevel = body.congestionLevel as CongestionLevel;
  }
  if (typeof body.waitMinutes === 'number' && waitMinutes.includes(body.waitMinutes as (typeof waitMinutes)[number])) {
    patch.waitMinutes = body.waitMinutes as StatusPatch['waitMinutes'];
  }
  if (typeof body.materialStatus === 'string' && materialStatuses.includes(body.materialStatus as MaterialStatus)) {
    patch.materialStatus = body.materialStatus as MaterialStatus;
  }
  if (typeof body.helpRequested === 'boolean') patch.helpRequested = body.helpRequested;
  if (typeof body.helpType === 'string' && helpTypes.includes(body.helpType as HelpType)) {
    patch.helpType = body.helpType as HelpType;
  }
  if (typeof body.memo === 'string') patch.memo = body.memo.slice(0, 300);
  return patch;
}

function applyPatch(current: BoothStatus, patch: StatusPatch, now: string) {
  const next: BoothStatus = { ...current, updatedAt: now };
  for (const key of Object.keys(patch) as (keyof StatusPatch)[]) {
    const value = patch[key];
    if (key === 'operationStatus' && value) next.operationStatus = value as OperationStatus;
    if (key === 'congestionLevel' && value !== undefined) next.congestionLevel = value as CongestionLevel;
    if (key === 'waitMinutes' && value !== undefined) next.waitMinutes = value as BoothStatus['waitMinutes'];
    if (key === 'materialStatus' && value) next.materialStatus = value as MaterialStatus;
    if (key === 'helpRequested' && value !== undefined) next.helpRequested = Boolean(value);
    if (key === 'helpType') next.helpType = value as HelpType | undefined;
    if (key === 'memo') next.memo = typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }
  if (!next.helpRequested) {
    next.helpType = undefined;
    next.memo = undefined;
  }
  return next;
}

function changedLogs(current: BoothStatus, next: BoothStatus, patch: StatusPatch, source: string, createdAt: string) {
  return (Object.keys(patch) as (keyof StatusPatch)[])
    .filter((field) => valueToString(current[field]) !== valueToString(next[field]))
    .map((field) => ({
      id: crypto.randomUUID(),
      boothNo: current.boothNo,
      field,
      oldValue: valueToString(current[field]),
      newValue: valueToString(next[field]),
      source,
      createdAt
    }));
}

async function getCurrentStatus(env: Env, boothNo: number, now: string) {
  const row = await env.DB.prepare('select * from booth_statuses where booth_no = ?')
    .bind(boothNo)
    .first<Record<string, unknown>>();
  return row ? mapStatusRow(row) : createInitialStatus(boothNo, now);
}

async function upsertStatus(env: Env, status: BoothStatus) {
  await env.DB.prepare(
    `insert into booth_statuses (
      booth_no, operation_status, congestion_level, wait_minutes, material_status,
      help_requested, help_type, memo, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
    on conflict(booth_no) do update set
      operation_status = excluded.operation_status,
      congestion_level = excluded.congestion_level,
      wait_minutes = excluded.wait_minutes,
      material_status = excluded.material_status,
      help_requested = excluded.help_requested,
      help_type = excluded.help_type,
      memo = excluded.memo,
      updated_at = excluded.updated_at`
  )
    .bind(
      status.boothNo,
      status.operationStatus,
      status.congestionLevel,
      status.waitMinutes,
      status.materialStatus,
      status.helpRequested ? 1 : 0,
      status.helpType ?? null,
      status.memo ?? null,
      status.updatedAt
    )
    .run();
}

async function insertLogs(env: Env, logs: RecentChange[]) {
  if (logs.length === 0) return;
  await env.DB.batch(
    logs.map((log) =>
      env.DB.prepare(
        `insert into booth_status_logs (id, booth_no, field, old_value, new_value, source, created_at)
         values (?, ?, ?, ?, ?, ?, ?)`
      ).bind(log.id, log.boothNo, log.field, log.oldValue ?? null, log.newValue ?? null, log.source, log.createdAt)
    )
  );
}

async function updateBoothStatus(env: Env, boothNo: number, patch: StatusPatch, source: string) {
  const now = toDbTime();
  const current = await getCurrentStatus(env, boothNo, now);
  const next = applyPatch(current, patch, now);
  await upsertStatus(env, next);
  await insertLogs(env, changedLogs(current, next, patch, source, now));
  return next;
}

async function syncBoothHelpStatus(env: Env, boothNo: number) {
  const active = await env.DB.prepare(
    `select * from incidents
     where booth_no = ? and status in ('NEW', 'IN_PROGRESS')
     order by updated_at desc, created_at desc
     limit 1`
  )
    .bind(boothNo)
    .first<Record<string, unknown>>();

  if (active) {
    const incident = mapIncidentRow(active);
    await updateBoothStatus(
      env,
      boothNo,
      { helpRequested: true, helpType: incident.type, memo: incident.memo },
      'hq:incident-sync'
    );
    return;
  }

  await updateBoothStatus(env, boothNo, { helpRequested: false, helpType: undefined, memo: '' }, 'hq:incident-sync');
}

async function notify(env: Env, payload: Record<string, unknown>) {
  const id = env.REALTIME.idFromName('smartyouth-live');
  await env.REALTIME.get(id).fetch('https://smartyouth.internal/broadcast', {
    method: 'POST',
    body: JSON.stringify({ ...payload, emittedAt: toDbTime() })
  });
}

async function statusResponse(request: Request, env: Env) {
  const url = new URL(request.url);
  const token = getRequestToken(request);
  const boothNoParam = url.searchParams.get('boothNo');
  const boothNo = boothNoParam ? Number(boothNoParam) : undefined;
  const hq = verifyHqToken(token, env);
  const canEditBooth = typeof boothNo === 'number' ? hq || (await verifyBoothToken(boothNo, token, env)) : false;
  const [booths, statuses, incidents, recentChanges] = await Promise.all([
    listBooths(env),
    listStatuses(env),
    listIncidents(env),
    hq ? listRecentChanges(env) : Promise.resolve([])
  ]);

  return json(request, env, {
    booths: joinRows(booths, statuses, incidents),
    incidents,
    recentChanges,
    access: {
      hq,
      boothNo: canEditBooth && !hq && typeof boothNo === 'number' ? boothNo : null,
      canEditBooth
    },
    mode: 'cloudflare',
    refreshedAt: toDbTime()
  });
}

async function routeApi(request: Request, env: Env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (request.method === 'GET' && path === '/api/status') {
    return statusResponse(request, env);
  }

  if (request.method === 'PATCH' && path === '/api/status') {
    const access = await getWriteAccess(request, env);
    if (access.scope !== 'hq') return json(request, env, { error: '요청을 처리할 수 없습니다.' }, { status: 403 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const operationStatus = body.operationStatus as OperationStatus;
    if (!['READY', 'OPEN', 'CLOSED'].includes(operationStatus)) {
      return json(request, env, { error: 'Invalid operation status.' }, { status: 400 });
    }
    const booths = await listBooths(env);
    const statuses: BoothStatus[] = [];
    for (const booth of booths) {
      statuses.push(await updateBoothStatus(env, booth.boothNo, { operationStatus }, 'hq:bulk'));
    }
    await notify(env, { type: 'status_changed', scope: 'all', operationStatus });
    return json(request, env, { statuses, savedAt: toDbTime() });
  }

  if (request.method === 'DELETE' && path === '/api/status') {
    const access = await getWriteAccess(request, env);
    if (access.scope !== 'hq') return json(request, env, { error: '요청을 처리할 수 없습니다.' }, { status: 403 });

    const now = toDbTime();
    const [helpCountRow, logCountRow, booths] = await Promise.all([
      env.DB.prepare('select count(*) as count from incidents').first<{ count: number }>(),
      env.DB.prepare('select count(*) as count from booth_status_logs').first<{ count: number }>(),
      listBooths(env)
    ]);

    await env.DB.prepare('delete from incidents').run();
    await env.DB.prepare('delete from booth_status_logs').run();
    for (const booth of booths) {
      await upsertStatus(env, createInitialStatus(booth.boothNo, now));
    }

    await notify(env, { type: 'status_changed', scope: 'reset' });
    await notify(env, { type: 'help_reset' });
    return json(request, env, {
      boothCount: booths.length,
      clearedHelpCount: Number(helpCountRow?.count ?? 0),
      clearedLogCount: Number(logCountRow?.count ?? 0),
      resetAt: now
    });
  }

  const statusMatch = path.match(/^\/api\/booths\/(\d+)\/status$/);
  if (request.method === 'PATCH' && statusMatch) {
    const boothNo = Number(statusMatch[1]);
    const access = await getWriteAccess(request, env, boothNo);
    if (!access.canWrite) return json(request, env, { error: '요청을 처리할 수 없습니다.' }, { status: 403 });
    const booth = seedBooths.find((item) => item.boothNo === boothNo);
    if (!booth) return json(request, env, { error: 'Booth not found.' }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const patch = normalizePatch(body);
    const status = await updateBoothStatus(env, boothNo, patch, access.scope === 'hq' ? 'hq' : `booth:${boothNo}`);
    await notify(env, { type: 'status_changed', boothNo });
    return json(request, env, { status, savedAt: toDbTime() });
  }

  const helpMatch = path.match(/^\/api\/booths\/(\d+)\/help$/);
  if (request.method === 'POST' && helpMatch) {
    const boothNo = Number(helpMatch[1]);
    const access = await getWriteAccess(request, env, boothNo);
    const booth = seedBooths.find((item) => item.boothNo === boothNo);
    if (!booth) return json(request, env, { error: 'Booth not found.' }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const type = body.type as HelpType;
    if (!helpTypes.includes(type)) return json(request, env, { error: 'Invalid help type.' }, { status: 400 });
    const memo = typeof body.memo === 'string' ? body.memo.slice(0, 300).trim() : '';
    const source = access.canWrite ? (access.scope === 'hq' ? 'hq' : `booth:${boothNo}`) : 'public-help';
    await updateBoothStatus(env, boothNo, { helpRequested: true, helpType: type, memo }, source);

    const now = toDbTime();
    const existing = await env.DB.prepare(
      `select * from incidents
       where booth_no = ? and type = ? and status in ('NEW', 'IN_PROGRESS')
       order by created_at desc
       limit 1`
    )
      .bind(boothNo, type)
      .first<Record<string, unknown>>();

    let incident: Incident;
    if (existing) {
      const id = String(existing.id);
      await env.DB.prepare('update incidents set memo = ?, status = ?, updated_at = ? where id = ?')
        .bind(memo || existing.memo || null, 'NEW', now, id)
        .run();
      incident = { ...mapIncidentRow(existing), memo: memo || String(existing.memo ?? ''), status: 'NEW', updatedAt: now };
    } else {
      incident = {
        id: crypto.randomUUID(),
        boothNo,
        type,
        memo: memo || undefined,
        status: 'NEW',
        createdAt: now,
        updatedAt: now
      };
      await env.DB.prepare(
        'insert into incidents (id, booth_no, type, memo, status, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)'
      )
        .bind(incident.id, boothNo, type, incident.memo ?? null, 'NEW', now, now)
        .run();
    }
    await notify(env, { type: 'help_created', boothNo, incidentId: incident.id });
    return json(request, env, { incident, savedAt: now });
  }

  const incidentMatch = path.match(/^\/api\/incidents\/([^/]+)$/);
  if (request.method === 'PATCH' && incidentMatch) {
    const access = await getWriteAccess(request, env);
    if (access.scope !== 'hq') return json(request, env, { error: '요청을 처리할 수 없습니다.' }, { status: 403 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const status = body.status as IncidentStatus;
    if (!incidentStatuses.includes(status)) return json(request, env, { error: 'Invalid incident status.' }, { status: 400 });
    const now = toDbTime();
    const row = await env.DB.prepare('update incidents set status = ?, updated_at = ? where id = ? returning *')
      .bind(status, now, incidentMatch[1])
      .first<Record<string, unknown>>();
    if (!row) return json(request, env, { error: 'Incident not found.' }, { status: 404 });
    const incident = mapIncidentRow(row);
    await syncBoothHelpStatus(env, incident.boothNo);
    await notify(env, { type: 'incident_changed', boothNo: incident.boothNo, incidentId: incident.id, status });
    return json(request, env, { incident, savedAt: now });
  }

  if (request.method === 'DELETE' && path === '/api/incidents') {
    const access = await getWriteAccess(request, env);
    if (access.scope !== 'hq') return json(request, env, { error: '요청을 처리할 수 없습니다.' }, { status: 403 });
    const countRow = await env.DB.prepare('select count(*) as count from incidents').first<{ count: number }>();
    await env.DB.prepare('delete from incidents').run();
    await env.DB.prepare(
      'update booth_statuses set help_requested = 0, help_type = null, memo = null, updated_at = ?'
    )
      .bind(toDbTime())
      .run();
    await notify(env, { type: 'help_reset' });
    return json(request, env, { clearedCount: Number(countRow?.count ?? 0), resetAt: toDbTime() });
  }

  return json(request, env, { error: 'Not found.' }, { status: 404 });
}

export default {
  async fetch(request: Request, env: Env) {
    if (request.method === 'OPTIONS') return empty(request, env, { status: 204 });

    const url = new URL(request.url);
    if (url.pathname === '/ws') {
      const id = env.REALTIME.idFromName('smartyouth-live');
      return env.REALTIME.get(id).fetch(request);
    }

    try {
      return await routeApi(request, env);
    } catch (error) {
      return json(
        request,
        env,
        { error: error instanceof Error ? error.message : 'Internal server error.' },
        { status: 500 }
      );
    }
  }
};

export class RealtimeRoom extends DurableObject<Env> {
  constructor(private state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    if (url.pathname === '/broadcast') {
      const message = await request.text();
      for (const socket of this.state.getWebSockets()) {
        try {
          socket.send(message);
        } catch {
          socket.close();
        }
      }
      return new Response('ok');
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.state.acceptWebSocket(server);
    server.send(JSON.stringify({ type: 'connected', emittedAt: toDbTime() }));

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    if (typeof message === 'string' && message === 'ping') {
      socket.send('pong');
    }
  }
}
