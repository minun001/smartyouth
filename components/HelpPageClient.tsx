'use client';

import { type FormEvent, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import { apiPath, isStaticDemo } from '@/lib/clientConfig';
import { formatTime, helpTypeLabels, helpTypeOrder, incidentStatusLabels } from '@/lib/statusLabels';
import {
  createStaticHelp,
  getInitialStaticStatus,
  getStaticStatus,
  patchStaticIncident,
  resetStaticHelpRequests,
  type ClientStatusResponse
} from '@/lib/staticDemoClient';
import type { HelpType, Incident, IncidentStatus } from '@/lib/types';
import { useRealtimeRefresh } from '@/lib/useRealtimeRefresh';

type HelpPageClientProps = {
  token?: string;
};

type DragPreviewState = {
  id: string;
  boothNo: number;
  boothName: string;
  helpType: HelpType;
  memo?: string;
  x: number;
  y: number;
  width: number;
  pointerOffsetX: number;
  pointerOffsetY: number;
  completing: boolean;
};

export default function HelpPageClient({ token }: HelpPageClientProps) {
  const [data, setData] = useState<ClientStatusResponse | null>(() =>
    isStaticDemo ? getInitialStaticStatus(token) : null
  );
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreviewState | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [isOverCompleteZone, setIsOverCompleteZone] = useState(false);
  const [requestBoothNo, setRequestBoothNo] = useState('');
  const [requestType, setRequestType] = useState<HelpType>('ETC');
  const [requestMemo, setRequestMemo] = useState('');
  const [requestSaving, setRequestSaving] = useState(false);
  const [requestSavedMessage, setRequestSavedMessage] = useState<string | null>(null);
  const [resetSaving, setResetSaving] = useState(false);
  const [resetSavedMessage, setResetSavedMessage] = useState<string | null>(null);
  const completeZoneRef = useRef<HTMLDivElement | null>(null);
  const dropAnimationTimerRef = useRef<number | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      if (isStaticDemo) {
        setData(getStaticStatus(token));
        setError(null);
        return;
      }

      const params = new URLSearchParams();
      if (token) params.set('t', token);
      const response = await fetch(`${apiPath('/api/status')}${params.toString() ? `?${params.toString()}` : ''}`, {
        cache: 'no-store'
      });
      if (!response.ok) {
        setError('도움 요청을 불러오지 못했습니다.');
        return;
      }

      setData((await response.json()) as ClientStatusResponse);
      setError(null);
    } catch {
      setError('도움 요청을 불러오지 못했습니다. 네트워크 상태를 확인해주세요.');
    }
  }, [token]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useRealtimeRefresh({ enabled: Boolean(data), onRefresh: loadStatus });

  useEffect(() => {
    if (!requestSavedMessage) return undefined;
    const id = window.setTimeout(() => setRequestSavedMessage(null), 3500);
    return () => window.clearTimeout(id);
  }, [requestSavedMessage]);

  useEffect(() => {
    if (!resetSavedMessage) return undefined;
    const id = window.setTimeout(() => setResetSavedMessage(null), 3500);
    return () => window.clearTimeout(id);
  }, [resetSavedMessage]);

  useEffect(() => {
    return () => {
      if (dropAnimationTimerRef.current) {
        window.clearTimeout(dropAnimationTimerRef.current);
      }
    };
  }, []);

  const boothNameByNo = useMemo(() => {
    return new Map(data?.booths.map((booth) => [booth.boothNo, booth.name]) ?? []);
  }, [data]);

  const activeIncidents = useMemo(() => {
    return sortActiveIncidents(data?.incidents.filter((incident) => incident.status !== 'RESOLVED') ?? []);
  }, [data]);

  const resolvedIncidents = useMemo(() => {
    return (data?.incidents.filter((incident) => incident.status === 'RESOLVED') ?? []).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
  }, [data]);

  const selectedRequestBoothName = useMemo(() => {
    const boothNo = Number(requestBoothNo);
    if (!Number.isInteger(boothNo)) return undefined;
    return boothNameByNo.get(boothNo);
  }, [boothNameByNo, requestBoothNo]);

  async function submitHelpRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || requestSaving) return;

    const boothNo = Number(requestBoothNo);
    const memo = requestMemo.trim();

    if (!Number.isInteger(boothNo) || !boothNameByNo.has(boothNo)) {
      setError('부스 번호를 다시 확인해주세요.');
      return;
    }

    if (!memo) {
      setError('도움이 필요한 내용을 적어주세요.');
      return;
    }

    setRequestSaving(true);
    setRequestSavedMessage(null);
    setError(null);

    try {
      if (isStaticDemo) {
        const result = await createStaticHelp(boothNo, token, requestType, memo);
        setRequestSavedMessage(`등록됨 · ${formatTime(result.savedAt)}`);
        setRequestMemo('');
        await loadStatus();
        return;
      }

      const suffix = token ? `?t=${encodeURIComponent(token)}` : '';
      const response = await fetch(`${apiPath(`/api/booths/${boothNo}/help`)}${suffix}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: requestType, memo })
      });

      if (!response.ok) throw new Error('Help request failed.');

      const result = (await response.json()) as { savedAt?: string };
      window.dispatchEvent(new CustomEvent('smartyouth-help-created'));
      setRequestSavedMessage(`등록됨 · ${formatTime(result.savedAt)}`);
      setRequestMemo('');
      await loadStatus();
    } catch {
      setError('도움 요청 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setRequestSaving(false);
    }
  }

  async function setIncidentStatus(id: string, status: IncidentStatus) {
    if (!data?.access.hq || savingId === id) return;
    setSavingId(id);

    try {
      if (isStaticDemo) {
        await patchStaticIncident(token, id, status);
        await loadStatus();
        return;
      }

      const suffix = token ? `?t=${encodeURIComponent(token)}` : '';
      const response = await fetch(`${apiPath(`/api/incidents/${id}`)}${suffix}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!response.ok) throw new Error('Incident update failed.');
      await loadStatus();
    } catch {
      setError('처리 실패. 다시 시도해주세요.');
    } finally {
      setSavingId(null);
    }
  }

  async function resetAllHelp() {
    if (!data?.access.hq || resetSaving) return;
    const totalCount = activeIncidents.length + resolvedIncidents.length;
    if (totalCount === 0) return;
    if (!window.confirm(`전체 도움 요청 ${totalCount}건을 초기화할까요? 완료 기록도 함께 비워집니다.`)) return;

    setResetSaving(true);
    setResetSavedMessage(null);
    setError(null);

    try {
      if (isStaticDemo) {
        const result = await resetStaticHelpRequests(token);
        setResetSavedMessage(`초기화됨 · ${result.clearedCount}건`);
        await loadStatus();
        return;
      }

      const suffix = token ? `?t=${encodeURIComponent(token)}` : '';
      const response = await fetch(`${apiPath('/api/incidents')}${suffix}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Reset failed.');

      const result = (await response.json()) as { clearedCount?: number };
      setResetSavedMessage(`초기화됨 · ${result.clearedCount ?? 0}건`);
      await loadStatus();
    } catch {
      setError('도움 요청 초기화에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setResetSaving(false);
    }
  }

  function isCoordinateOverCompleteZone(clientX: number, clientY: number) {
    const rect = completeZoneRef.current?.getBoundingClientRect();
    if (!rect) return false;
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }

  function startDrag(event: ReactPointerEvent<HTMLElement>, incident: Incident) {
    if (!data?.access.hq || savingId || incident.status === 'RESOLVED') return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const sourceElement = event.currentTarget.closest('article') ?? event.currentTarget;
    const rect = sourceElement.getBoundingClientRect();
    setDraggingId(incident.id);
    setDragPreview({
      id: incident.id,
      boothNo: incident.boothNo,
      boothName: boothNameByNo.get(incident.boothNo) ?? '부스',
      helpType: incident.type,
      memo: incident.memo,
      x: rect.left,
      y: rect.top,
      width: rect.width,
      pointerOffsetX: event.clientX - rect.left,
      pointerOffsetY: event.clientY - rect.top,
      completing: false
    });
    setIsOverCompleteZone(false);
  }

  useEffect(() => {
    if (!draggingId) return undefined;

    const finishDrag = (clientX: number, clientY: number) => {
      const incidentId = draggingId;
      const shouldComplete = isCoordinateOverCompleteZone(clientX, clientY);
      setDraggingId(null);

      if (!shouldComplete) {
        setDragPreview(null);
        setIsOverCompleteZone(false);
        return;
      }

      setCompletingId(incidentId);
      setIsOverCompleteZone(true);
      setDragPreview((preview) => {
        if (!preview) return preview;
        const rect = completeZoneRef.current?.getBoundingClientRect();
        return {
          ...preview,
          completing: true,
          x: rect ? rect.left + rect.width / 2 - preview.width / 2 : preview.x,
          y: rect ? rect.top + rect.height / 2 - 64 : preview.y
        };
      });

      if (dropAnimationTimerRef.current) {
        window.clearTimeout(dropAnimationTimerRef.current);
      }

      dropAnimationTimerRef.current = window.setTimeout(() => {
        setDragPreview(null);
        setIsOverCompleteZone(false);
        dropAnimationTimerRef.current = null;
        void setIncidentStatus(incidentId, 'RESOLVED').finally(() => setCompletingId(null));
      }, 280);
    };

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      setIsOverCompleteZone(isCoordinateOverCompleteZone(event.clientX, event.clientY));
      setDragPreview((preview) =>
        preview && !preview.completing
          ? {
              ...preview,
              x: event.clientX - preview.pointerOffsetX,
              y: event.clientY - preview.pointerOffsetY
            }
          : preview
      );
    };
    const handlePointerUp = (event: PointerEvent) => finishDrag(event.clientX, event.clientY);
    const handlePointerCancel = () => {
      setDraggingId(null);
      setDragPreview(null);
      setIsOverCompleteZone(false);
    };
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      event.preventDefault();
      setIsOverCompleteZone(isCoordinateOverCompleteZone(touch.clientX, touch.clientY));
      setDragPreview((preview) =>
        preview && !preview.completing
          ? {
              ...preview,
              x: touch.clientX - preview.pointerOffsetX,
              y: touch.clientY - preview.pointerOffsetY
            }
          : preview
      );
    };
    const handleTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (touch) finishDrag(touch.clientX, touch.clientY);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handlePointerCancel);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handlePointerCancel);
    };
  }, [draggingId]);

  const activeCount = activeIncidents.length;
  const resolvedCount = resolvedIncidents.length;
  const canSubmitHelp = Boolean(data);
  const canManageHelp = Boolean(data?.access.hq);

  return (
    <div className="min-h-screen text-slate-950">
      <AppHeader title="도움 요청 처리" lastRefresh={data?.refreshedAt} onRefresh={() => void loadStatus()} />
      <main className="safe-bottom mx-auto max-w-6xl space-y-4 px-4 py-4 sm:py-5">
        <section className="rounded-lg bg-gradient-to-br from-[var(--asan-blue)] via-[var(--asan-sky)] to-[var(--asan-green)] p-5 text-white shadow-[0_24px_60px_rgba(0,96,176,0.22)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--asan-yellow)]">Help Queue</div>
              <h1 className="mt-2 text-3xl font-black leading-tight">현장 도움 요청</h1>
              <p className="mt-2 text-sm font-bold text-white">
                부스 번호와 내용을 등록하고, 해결된 요청은 완료 영역으로 끌어 옮깁니다.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:min-w-[240px]">
              <QueueMetric label="처리할 요청" value={activeCount} danger={activeCount > 0} />
              <QueueMetric label="완료" value={resolvedCount} />
            </div>
          </div>
        </section>

        {data && !canManageHelp ? (
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm font-black text-[var(--brand-strong)]">
            도움 요청 데이터를 불러오는 중입니다. 잠시 후 다시 시도해주세요.
          </div>
        ) : null}

        {error ? <div className="rounded-lg bg-red-50 p-4 text-sm font-black text-red-700">{error}</div> : null}

        {!data ? (
          <div className="rounded-lg bg-white p-6 text-center text-base font-black text-slate-500">불러오는 중</div>
        ) : null}

        {data ? (
          <>
            <HelpRequestForm
              boothNo={requestBoothNo}
              helpType={requestType}
              memo={requestMemo}
              selectedBoothName={selectedRequestBoothName}
              canSubmit={canSubmitHelp}
              saving={requestSaving}
              savedMessage={requestSavedMessage}
              onBoothNoChange={setRequestBoothNo}
              onHelpTypeChange={setRequestType}
              onMemoChange={setRequestMemo}
              onSubmit={submitHelpRequest}
            />

            <HelpResetPanel
              canReset={canManageHelp}
              activeCount={activeCount}
              resolvedCount={resolvedCount}
              saving={resetSaving}
              savedMessage={resetSavedMessage}
              onReset={() => void resetAllHelp()}
            />

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-slate-950">처리할 요청</h2>
                <span className="rounded-md bg-red-600 px-3 py-1 text-sm font-black text-white">{activeCount}</span>
              </div>

              {activeIncidents.length > 0 ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {activeIncidents.map((incident) => {
                    const isDragging = draggingId === incident.id;
                    const isCompleting = completingId === incident.id;
                    const canHandle = canManageHelp && savingId !== incident.id;

                    return (
                      <article
                        key={incident.id}
                        data-help-active-card={incident.id}
                        className={`rounded-lg border bg-white p-4 shadow-sm transition ${
                          isCompleting ? 'scale-[0.98] opacity-35' : ''
                        } ${
                          isDragging
                            ? 'scale-[0.99] border-[var(--asan-blue)] opacity-45 shadow-[0_18px_48px_rgba(0,96,176,0.22)]'
                            : incident.status === 'NEW'
                              ? 'border-red-200'
                              : 'border-[var(--line)]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-black text-slate-500">부스 {incident.boothNo}</div>
                            <div className="mt-1 text-lg font-black leading-snug text-slate-950">
                              {boothNameByNo.get(incident.boothNo) ?? '부스'}
                            </div>
                          </div>
                          <div className="shrink-0 rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                            {helpTypeLabels[incident.type]}
                          </div>
                        </div>

                        {incident.memo ? (
                          <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm font-bold text-slate-700">
                            {incident.memo}
                          </div>
                        ) : null}

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                          <span
                            className={`rounded-md px-2 py-1 font-black ${
                              incident.status === 'NEW'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-sky-50 text-[var(--brand-strong)]'
                            }`}
                          >
                            {incidentStatusLabels[incident.status]}
                          </span>
                          <span>요청 {formatTime(incident.createdAt)}</span>
                        </div>

                        {canManageHelp ? (
                          <>
                            <div
                              data-help-drag-handle={incident.id}
                              role="button"
                              tabIndex={canHandle ? 0 : -1}
                              aria-label={`부스 ${incident.boothNo} 도움 요청 완료 처리`}
                              onPointerDown={(event) => startDrag(event, incident)}
                              onKeyDown={(event) => {
                                if (canHandle && (event.key === 'Enter' || event.key === ' ')) {
                                  event.preventDefault();
                                  void setIncidentStatus(incident.id, 'RESOLVED');
                                }
                              }}
                              className="mt-4 flex min-h-14 touch-none select-none items-center justify-between rounded-lg border-2 border-dashed border-[var(--asan-blue)] bg-sky-50 px-4 text-base font-black text-[var(--brand-strong)] transition active:cursor-grabbing"
                            >
                              <span>
                                {savingId === incident.id
                                  ? '처리 중'
                                  : isDragging && isOverCompleteZone
                                    ? '놓으면 완료'
                                    : '끌고 놓기'}
                              </span>
                              <span className="rounded-md bg-white px-3 py-1 text-sm">완료</span>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                disabled={savingId === incident.id || incident.status === 'IN_PROGRESS'}
                                onClick={() => void setIncidentStatus(incident.id, 'IN_PROGRESS')}
                                className="min-h-12 rounded-lg border border-slate-200 bg-white text-base font-black text-slate-700 disabled:opacity-50"
                              >
                                처리 시작
                              </button>
                              <button
                                type="button"
                                disabled={savingId === incident.id}
                                onClick={() => void setIncidentStatus(incident.id, 'RESOLVED')}
                                className="min-h-12 rounded-lg bg-slate-900 text-base font-black text-white disabled:opacity-50"
                              >
                                완료 처리
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm font-black text-slate-500">
                            운영본부에서 확인 후 처리합니다.
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-[var(--line)] bg-white p-5 text-center text-sm font-bold text-slate-500 shadow-sm">
                  처리할 도움 요청이 없습니다.
                </div>
              )}
            </section>

            {canManageHelp && draggingId ? (
              <div
                data-help-complete-zone="true"
                ref={completeZoneRef}
                className={`sticky bottom-[calc(env(safe-area-inset-bottom)+var(--bottom-nav-height)+8px)] z-30 rounded-lg border-2 border-dashed p-4 text-center shadow-[0_18px_48px_rgba(15,23,42,0.18)] transition ${
                  isOverCompleteZone
                    ? 'help-complete-zone-active border-emerald-500 bg-emerald-500 text-white'
                    : draggingId
                      ? 'border-[var(--asan-blue)] bg-white text-[var(--brand-strong)]'
                      : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="text-lg font-black">{isOverCompleteZone ? '놓으면 완료' : '완료 영역'}</div>
                <div className="mt-1 text-xs font-bold opacity-80">요청 카드를 아래로 끌어 옮기기</div>
              </div>
            ) : null}

            <section className="space-y-3 rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-slate-950">완료</h2>
                <span className="rounded-md bg-[var(--brand)] px-3 py-1 text-sm font-black text-white">
                  {resolvedCount}
                </span>
              </div>
              {resolvedIncidents.length > 0 ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {resolvedIncidents.slice(0, 8).map((incident) => (
                    <article
                      key={incident.id}
                      data-help-resolved-card={incident.id}
                      className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-slate-700"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-black text-emerald-700">완료된 도움 요청</div>
                          <div className="mt-1 text-base font-black text-slate-950">
                            부스 {incident.boothNo} · {boothNameByNo.get(incident.boothNo) ?? '부스'}
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700">
                          {helpTypeLabels[incident.type]}
                        </span>
                      </div>
                      {incident.memo ? (
                        <div className="mt-3 rounded-md bg-white p-3 leading-6 text-slate-700">{incident.memo}</div>
                      ) : (
                        <div className="mt-3 rounded-md bg-white p-3 text-slate-500">내용 없음</div>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-slate-500">
                        <span>요청 {formatTime(incident.createdAt)}</span>
                        <span>·</span>
                        <span>완료 {formatTime(incident.updatedAt)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-500">
                  아직 완료된 요청이 없습니다.
                </div>
              )}
            </section>
          </>
        ) : null}
      </main>
      {dragPreview ? <HelpDragPreview preview={dragPreview} isOverCompleteZone={isOverCompleteZone} /> : null}
      <BottomNav token={token} hqMode={canManageHelp} />
    </div>
  );
}

function HelpDragPreview({
  preview,
  isOverCompleteZone
}: {
  preview: DragPreviewState;
  isOverCompleteZone: boolean;
}) {
  return (
    <article
      data-help-drag-preview={preview.id}
      data-help-drag-state={preview.completing || isOverCompleteZone ? 'complete' : 'dragging'}
      aria-hidden="true"
      className={`help-drag-preview fixed left-0 top-0 z-[70] rounded-lg border p-4 ${
        preview.completing || isOverCompleteZone
          ? 'help-drag-preview-complete border-emerald-300 bg-emerald-50'
          : 'border-[var(--asan-blue)] bg-white'
      }`}
      style={{
        width: preview.width,
        transform: `translate3d(${preview.x}px, ${preview.y}px, 0) scale(${
          preview.completing ? 0.92 : isOverCompleteZone ? 1.02 : 1
        })`
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-black text-slate-500">부스 {preview.boothNo}</div>
          <div className="mt-1 truncate text-lg font-black leading-snug text-slate-950">{preview.boothName}</div>
        </div>
        <div className="shrink-0 rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
          {helpTypeLabels[preview.helpType]}
        </div>
      </div>
      {preview.memo ? (
        <div className="mt-3 line-clamp-2 rounded-md bg-white/80 p-3 text-sm font-bold text-slate-700">
          {preview.memo}
        </div>
      ) : null}
      <div className="mt-3 rounded-lg bg-[var(--asan-blue)] px-4 py-3 text-center text-sm font-black text-white">
        {preview.completing ? '완료 영역으로 이동 중' : isOverCompleteZone ? '놓으면 완료 처리' : '카드를 완료 영역으로 이동'}
      </div>
    </article>
  );
}

function HelpResetPanel({
  canReset,
  activeCount,
  resolvedCount,
  saving,
  savedMessage,
  onReset
}: {
  canReset: boolean;
  activeCount: number;
  resolvedCount: number;
  saving: boolean;
  savedMessage: string | null;
  onReset: () => void;
}) {
  const totalCount = activeCount + resolvedCount;

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950">도움 요청 관리</h2>
          <p className="mt-1 text-sm font-bold text-slate-600">
            처리할 요청 {activeCount}건 · 완료 {resolvedCount}건
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:min-w-[220px]">
          {savedMessage ? (
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-center text-sm font-black text-emerald-700">
              {savedMessage}
            </div>
          ) : null}
          <button
            type="button"
            disabled={!canReset || saving || totalCount === 0}
            onClick={onReset}
            className="min-h-12 rounded-lg bg-slate-900 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? '초기화 중' : '전체 도움 요청 초기화'}
          </button>
          {!canReset ? (
            <div className="text-center text-xs font-bold text-slate-500">상황을 불러오면 초기화할 수 있습니다.</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function HelpRequestForm({
  boothNo,
  helpType,
  memo,
  selectedBoothName,
  canSubmit,
  saving,
  savedMessage,
  onBoothNoChange,
  onHelpTypeChange,
  onMemoChange,
  onSubmit
}: {
  boothNo: string;
  helpType: HelpType;
  memo: string;
  selectedBoothName?: string;
  canSubmit: boolean;
  saving: boolean;
  savedMessage: string | null;
  onBoothNoChange: (value: string) => void;
  onHelpTypeChange: (value: HelpType) => void;
  onMemoChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">새 도움 요청</h2>
          <p className="mt-1 text-sm font-bold text-slate-600">도움이 필요한 부스 번호와 내용을 적어주세요.</p>
        </div>
        {savedMessage ? (
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">{savedMessage}</div>
        ) : null}
      </div>

      <form className="mt-4 space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <label className="block">
            <span className="text-sm font-black text-slate-700">부스 번호</span>
            <input
              type="text"
              pattern="[0-9]*"
              inputMode="numeric"
              value={boothNo}
              disabled={!canSubmit || saving}
              onChange={(event) => onBoothNoChange(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-lg font-black text-slate-950 disabled:bg-slate-50 disabled:text-slate-400"
              placeholder="예: 12"
            />
          </label>

          <div>
            <div className="text-sm font-black text-slate-700">요청 종류</div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {helpTypeOrder.map((type) => (
                <button
                  key={type}
                  type="button"
                  disabled={!canSubmit || saving}
                  onClick={() => onHelpTypeChange(type)}
                  className={`min-h-12 rounded-lg border px-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60 ${
                    helpType === type ? 'border-red-500 bg-red-500 text-white' : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {helpTypeLabels[type]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {selectedBoothName ? (
          <div className="rounded-md bg-sky-50 px-3 py-2 text-sm font-black text-[var(--brand-strong)]">
            선택 부스 · {selectedBoothName}
          </div>
        ) : boothNo ? (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-black text-red-700">
            등록된 부스 번호인지 확인해주세요.
          </div>
        ) : null}

        <label className="block">
          <span className="text-sm font-black text-slate-700">내용</span>
          <textarea
            value={memo}
            disabled={!canSubmit || saving}
            onChange={(event) => onMemoChange(event.target.value)}
            maxLength={300}
            rows={3}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-base font-bold leading-6 text-slate-950 disabled:bg-slate-50 disabled:text-slate-400"
            placeholder="필요한 도움을 짧게 적어주세요."
          />
        </label>

        {!canSubmit ? (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-black text-red-700">
            도움 요청 정보를 불러오면 등록할 수 있습니다.
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit || saving}
          className="min-h-14 w-full rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-base font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? '등록 중' : '도움 요청 등록'}
        </button>
      </form>
    </section>
  );
}

function sortActiveIncidents(incidents: Incident[]) {
  const statusWeight: Record<IncidentStatus, number> = {
    NEW: 0,
    IN_PROGRESS: 1,
    RESOLVED: 2
  };

  return [...incidents].sort((a, b) => {
    if (statusWeight[a.status] !== statusWeight[b.status]) {
      return statusWeight[a.status] - statusWeight[b.status];
    }

    return b.createdAt.localeCompare(a.createdAt);
  });
}

function QueueMetric({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${danger ? 'bg-red-500 text-white' : 'bg-white/10 text-white'}`}>
      <div className="text-xs font-black text-white/75">{label}</div>
      <div className="mt-1 text-3xl font-black leading-none">{value}</div>
    </div>
  );
}
