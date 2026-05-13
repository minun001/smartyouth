'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AppHeader from './AppHeader';
import BoothCard from './BoothCard';
import BoothControlPanel from './BoothControlPanel';
import BottomNav from './BottomNav';
import FilterChips from './FilterChips';
import MapView from './MapView';
import SummaryCards from './SummaryCards';
import { apiPath, isStaticDemo } from '@/lib/clientConfig';
import { formatTime } from '@/lib/statusLabels';
import {
  getInitialStaticStatus,
  getStaticStatus,
  patchStaticAllOperationStatuses,
  resetStaticOperations,
  type ClientStatusResponse
} from '@/lib/staticDemoClient';
import type { BoothStatus, DashboardFilter, OperationStatus } from '@/lib/types';
import { useRealtimeRefresh } from '@/lib/useRealtimeRefresh';

type DashboardViewProps = {
  mode: 'public' | 'hq';
  token?: string | null;
  view?: 'map' | 'overview';
};

export default function DashboardView({ mode, token, view = 'map' }: DashboardViewProps) {
  const [data, setData] = useState<ClientStatusResponse | null>(() =>
    isStaticDemo ? getInitialStaticStatus(token) : null
  );
  const [filter, setFilter] = useState<DashboardFilter>('all');
  const [selectedBoothNo, setSelectedBoothNo] = useState<number | null>(null);
  const [expandedBoothNo, setExpandedBoothNo] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isStaticDemo);
  const [bulkSaving, setBulkSaving] = useState<OperationStatus | null>(null);
  const [resetSaving, setResetSaving] = useState(false);
  const [bulkSavedMessage, setBulkSavedMessage] = useState<string | null>(null);

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
        setError('상황을 불러오지 못했습니다.');
        return;
      }

      setData((await response.json()) as ClientStatusResponse);
      setError(null);
    } catch {
      setError('상황을 불러오지 못했습니다. 네트워크 상태를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useRealtimeRefresh({ enabled: Boolean(data), onRefresh: loadStatus });

  useEffect(() => {
    if (!bulkSavedMessage) return undefined;
    const id = window.setTimeout(() => setBulkSavedMessage(null), 3500);
    return () => window.clearTimeout(id);
  }, [bulkSavedMessage]);

  const canEdit = Boolean(data?.access.hq);
  const selectedBooth = data?.booths.find((booth) => booth.boothNo === selectedBoothNo);
  const openCount = useMemo(() => data?.booths.filter((booth) => booth.status.operationStatus === 'OPEN').length ?? 0, [data]);
  const congestedCount = useMemo(
    () => data?.booths.filter((booth) => booth.status.congestionLevel >= 3).length ?? 0,
    [data]
  );

  const visibleBooths = useMemo(() => {
    if (!data) return [];

    return data.booths
      .filter((booth) => {
        if (filter === 'problem') return booth.problem;
        if (filter === 'open') return booth.status.operationStatus === 'OPEN';
        if (filter === 'congested') return booth.status.congestionLevel >= 3;
        if (filter === 'help') return booth.status.helpRequested;
        if (filter === 'closed') return booth.status.operationStatus === 'CLOSED';
        return true;
      })
      .sort((a, b) => {
        if (a.problem !== b.problem) return a.problem ? -1 : 1;
        if (a.status.helpRequested !== b.status.helpRequested) return a.status.helpRequested ? -1 : 1;
        if (a.status.congestionLevel !== b.status.congestionLevel) {
          return b.status.congestionLevel - a.status.congestionLevel;
        }
        return a.boothNo - b.boothNo;
      });
  }, [data, filter]);

  function applyLocalStatus(status: BoothStatus) {
    setData((current) => {
      if (!current) return current;
      return {
        ...current,
        booths: current.booths.map((booth) => (booth.boothNo === status.boothNo ? { ...booth, status } : booth))
      };
    });
  }

  async function patchAllOperationStatus(operationStatus: OperationStatus) {
    if (!canEdit) return;

    const label = operationStatusBulkLabel(operationStatus);
    setBulkSaving(operationStatus);
    setBulkSavedMessage(null);
    setError(null);

    try {
      if (isStaticDemo) {
        const result = await patchStaticAllOperationStatuses(token, operationStatus);
        setData(getStaticStatus(token));
        setBulkSavedMessage(`전체 ${label}으로 변경됨 · ${formatTime(result.savedAt)}`);
        return;
      }

      const params = new URLSearchParams();
      if (token) params.set('t', token);

      const response = await fetch(`${apiPath('/api/status')}${params.toString() ? `?${params.toString()}` : ''}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationStatus })
      });

      if (!response.ok) throw new Error('Bulk update failed.');

      const result = (await response.json()) as { savedAt?: string };
      await loadStatus();
      setBulkSavedMessage(`전체 ${label}으로 변경됨 · ${formatTime(result.savedAt)}`);
    } catch {
      setError('일괄 변경에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setBulkSaving(null);
    }
  }

  function confirmAndPatchAllOperationStatus(operationStatus: OperationStatus) {
    const label = operationStatusBulkLabel(operationStatus);
    if (!window.confirm(`전체 ${data?.booths.length ?? 0}개 부스를 ${label}으로 변경할까요?`)) return;
    void patchAllOperationStatus(operationStatus);
  }

  async function resetAllOperations() {
    if (!canEdit || resetSaving) return;

    const confirmed = window.confirm(
      `운영본부 관리 모드 전체를 초기화할까요?\n\n전체 부스는 준비중/여유 상태로 돌아가고, 도움 요청과 최근 변경 기록도 비워집니다.`
    );
    if (!confirmed) return;

    setResetSaving(true);
    setBulkSavedMessage(null);
    setError(null);

    try {
      if (isStaticDemo) {
        const result = await resetStaticOperations(token);
        setData(getStaticStatus(token));
        setFilter('all');
        setSelectedBoothNo(null);
        setExpandedBoothNo(null);
        setBulkSavedMessage(`전체 초기화됨 · ${result.boothCount}개 부스 · ${formatTime(result.resetAt)}`);
        return;
      }

      const params = new URLSearchParams();
      if (token) params.set('t', token);

      const response = await fetch(`${apiPath('/api/status')}${params.toString() ? `?${params.toString()}` : ''}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Reset failed.');

      const result = (await response.json()) as { boothCount?: number; resetAt?: string };
      await loadStatus();
      setFilter('all');
      setSelectedBoothNo(null);
      setExpandedBoothNo(null);
      setBulkSavedMessage(`전체 초기화됨 · ${result.boothCount ?? data?.booths.length ?? 0}개 부스 · ${formatTime(result.resetAt)}`);
    } catch {
      setError('전체 초기화에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setResetSaving(false);
    }
  }

  const isMapView = view === 'map';
  const bulkControlsDisabled = !canEdit || Boolean(bulkSaving) || resetSaving;
  const headerHeight = canEdit ? '120px' : '76px';

  return (
    <div className="min-h-screen text-slate-950" style={{ '--app-header-height': headerHeight } as React.CSSProperties}>
      <AppHeader
        title={isMapView ? '운영 상황' : mode === 'hq' ? '전체 상황 관리' : '전체 상황'}
        lastRefresh={data?.refreshedAt}
        onRefresh={() => void loadStatus()}
        onResetAll={canEdit ? () => void resetAllOperations() : undefined}
        resetDisabled={!canEdit || resetSaving || Boolean(bulkSaving)}
        resetLoading={resetSaving}
      />

      <main
        className={
          isMapView
            ? 'flex h-[calc(100dvh-var(--app-header-height))] overflow-hidden bg-slate-100 pb-[var(--bottom-nav-map-clearance)]'
            : 'safe-bottom content-shell content-gutter space-y-4 py-4 sm:py-5'
        }
      >
        {mode === 'hq' && data && !data.access.hq ? (
          <section className="m-4 rounded-lg border border-red-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-black text-red-600">상황 확인 필요</div>
            <h1 className="mt-2 text-2xl font-black leading-tight text-slate-950">운영 데이터를 다시 확인해주세요</h1>
            <p className="mt-3 text-sm font-bold leading-6 text-slate-600">
              운영 데이터를 불러오지 못했습니다. 새로고침 후 다시 확인해주세요.
            </p>
          </section>
        ) : null}

        {error ? (
          <div className={`${isMapView ? 'm-4' : ''} rounded-lg bg-red-50 p-4 text-sm font-black text-red-700`}>
            {error}
          </div>
        ) : null}

        {loading && !data ? (
          <div
            className={
              isMapView
                ? 'flex h-full flex-1 items-center justify-center bg-white text-base font-black text-slate-500'
                : 'rounded-lg bg-white p-6 text-center text-base font-black text-slate-500'
            }
          >
            불러오는 중
          </div>
        ) : null}

        {data && !(mode === 'hq' && !data.access.hq) ? (
          isMapView ? (
            <>
              <div className={`${selectedBooth && canEdit ? 'hidden lg:flex' : 'flex'} min-w-0 flex-1`}>
                <MapView
                  booths={data.booths}
                  editable={canEdit}
                  fullScreen
                  showProblemList={false}
                  bulkControls={
                    <MapBulkOperationControls
                      canEdit={canEdit}
                      saving={bulkSaving}
                      disabled={bulkControlsDisabled}
                      onChange={(operationStatus) => void confirmAndPatchAllOperationStatus(operationStatus)}
                    />
                  }
                  onEdit={(selected) => setSelectedBoothNo(selected.boothNo)}
                />
              </div>
              {selectedBooth && canEdit ? (
                <div className="safe-scroll-bottom min-h-0 flex-1 overflow-y-auto bg-slate-100 p-3 lg:w-[420px] lg:flex-none lg:border-l lg:border-[var(--line)] lg:p-4 xl:w-[460px] 2xl:w-[540px]">
                  <div className="mx-auto w-full max-w-xl lg:max-w-none">
                    <BoothControlPanel
                      booth={selectedBooth}
                      token={token}
                      canEdit={canEdit}
                      onClose={() => setSelectedBoothNo(null)}
                      onUpdated={applyLocalStatus}
                      onSaved={() => void loadStatus()}
                    />
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <CommandBrief
                mode={mode}
                canEdit={canEdit}
                openCount={openCount}
                congestedCount={congestedCount}
                totalCount={data.booths.length}
                lastRefresh={data.refreshedAt}
              />
              <SummaryCards booths={data.booths} />

              <BulkOperationControls
                totalCount={data.booths.length}
                canEdit={canEdit}
                saving={bulkSaving}
                resetSaving={resetSaving}
                savedMessage={bulkSavedMessage}
                onChange={(operationStatus) => void patchAllOperationStatus(operationStatus)}
                onReset={() => void resetAllOperations()}
              />

              <section className="space-y-3">
                <SectionHeader title="전체 부스" count={visibleBooths.length} />
                <FilterChips
                  active={filter}
                  onChange={(nextFilter) => {
                    setFilter(nextFilter);
                    setExpandedBoothNo(null);
                    setSelectedBoothNo(null);
                  }}
                />
              </section>

              <section className="space-y-3">
                {visibleBooths.length > 0 ? (
                  <div className="grid gap-3">
                    {visibleBooths.map((booth) => (
                      <BoothCard
                        key={booth.boothNo}
                        booth={booth}
                        editable={canEdit}
                        expanded={expandedBoothNo === booth.boothNo}
                        onExpandedChange={(nextExpanded) => {
                          setExpandedBoothNo(nextExpanded ? booth.boothNo : null);
                          setSelectedBoothNo(nextExpanded && canEdit ? booth.boothNo : null);
                        }}
                      >
                        {expandedBoothNo === booth.boothNo && selectedBoothNo === booth.boothNo && canEdit ? (
                          <BoothControlPanel
                            booth={booth}
                            token={token}
                            canEdit={canEdit}
                            variant="inline"
                            onClose={() => {
                              setSelectedBoothNo(null);
                              setExpandedBoothNo(null);
                            }}
                            onUpdated={applyLocalStatus}
                            onSaved={() => void loadStatus()}
                          />
                        ) : null}
                      </BoothCard>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg bg-white p-5 text-center text-sm font-bold text-slate-500">
                    표시할 부스가 없습니다.
                  </div>
                )}
              </section>

              {canEdit ? (
                <section className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
                  <SectionHeader title="최근 변경" count={data.recentChanges.length} />
                  <div className="mt-3 space-y-2">
                    {data.recentChanges.length > 0 ? (
                      data.recentChanges.map((change) => (
                        <div
                          key={change.id}
                          className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-3 text-sm font-bold text-slate-600"
                        >
                          <div className="min-w-0">
                            <span className="font-black text-slate-950">부스 {change.boothNo}</span> · {change.field} ·{' '}
                            {change.oldValue ?? '-'} → {change.newValue ?? '-'}
                          </div>
                          <span className="shrink-0 text-xs font-black text-slate-500">
                            {formatTime(change.createdAt)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm font-bold text-slate-500">아직 변경 기록이 없습니다.</div>
                    )}
                  </div>
                </section>
              ) : null}
            </>
          )
        ) : null}
      </main>

      <BottomNav token={token} hqMode={mode === 'hq' && Boolean(token)} />
    </div>
  );
}

function operationStatusBulkLabel(operationStatus: OperationStatus) {
  if (operationStatus === 'READY') return '준비중';
  if (operationStatus === 'OPEN') return '운영중';
  if (operationStatus === 'PAUSED') return '잠시중단';
  return '마감';
}

function MapBulkOperationControls({
  canEdit,
  saving,
  disabled,
  onChange
}: {
  canEdit: boolean;
  saving: OperationStatus | null;
  disabled: boolean;
  onChange: (operationStatus: OperationStatus) => void;
}) {
  const actions: Array<{
    status: OperationStatus;
    label: string;
    className: string;
  }> = [
    {
      status: 'READY',
      label: '일괄 준비중',
      className: 'border-[var(--asan-blue)] bg-[var(--asan-blue)] text-white'
    },
    {
      status: 'OPEN',
      label: '일괄 운영중',
      className: 'border-emerald-500 bg-emerald-500 text-white'
    },
    {
      status: 'CLOSED',
      label: '일괄 마감',
      className: 'border-slate-900 bg-slate-900 text-white'
    }
  ];

  return (
    <div
      data-map-bulk-controls="true"
      className="flex flex-col gap-2 rounded-lg border border-[var(--line)] bg-slate-50 p-2 sm:flex-row sm:items-center sm:justify-between sm:p-3"
    >
      <div className="hidden min-w-0 sm:block">
        <div className="text-sm font-black text-slate-950">일괄 운영 변경</div>
        <div className="mt-0.5 text-xs font-bold text-slate-500">
          {canEdit ? '지도 전체 부스를 한 번에 전환합니다.' : '상황을 불러오면 활성화됩니다.'}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
        {actions.map((action) => (
          <button
            key={action.status}
            type="button"
            data-map-bulk-action={action.status}
            disabled={disabled}
            onClick={() => onChange(action.status)}
            className={`min-h-11 rounded-lg border px-2 text-sm font-black shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${action.className}`}
          >
            {saving === action.status ? '변경 중' : action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BulkOperationControls({
  totalCount,
  canEdit,
  saving,
  resetSaving,
  savedMessage,
  onChange,
  onReset
}: {
  totalCount: number;
  canEdit: boolean;
  saving: OperationStatus | null;
  resetSaving: boolean;
  savedMessage: string | null;
  onChange: (operationStatus: OperationStatus) => void;
  onReset: () => void;
}) {
  const disabled = !canEdit || Boolean(saving) || resetSaving;

  function confirmAndChange(operationStatus: OperationStatus) {
    const label = operationStatusBulkLabel(operationStatus);
    if (!window.confirm(`전체 ${totalCount}개 부스를 ${label}으로 변경할까요?`)) return;
    onChange(operationStatus);
  }

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">전체 상태 변경</h2>
          <p className="mt-1 text-sm font-bold text-slate-600">
            {canEdit
              ? `전체 ${totalCount}개 부스를 한 번에 표시합니다.`
              : '상황을 불러오면 전체 상태를 변경할 수 있습니다.'}
          </p>
        </div>
        {savedMessage ? (
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">
            {savedMessage}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <button
          type="button"
          disabled={disabled}
          onClick={() => confirmAndChange('READY')}
          className="min-h-14 rounded-lg bg-[var(--asan-blue)] px-3 text-base font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving === 'READY' ? '변경 중' : '전체 준비중'}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => confirmAndChange('OPEN')}
          className="min-h-14 rounded-lg bg-[var(--asan-green)] px-3 text-base font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving === 'OPEN' ? '변경 중' : '전체 운영중'}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => confirmAndChange('CLOSED')}
          className="min-h-14 rounded-lg bg-slate-800 px-3 text-base font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving === 'CLOSED' ? '변경 중' : '전체 마감'}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onReset}
          className="col-span-2 min-h-14 rounded-lg border border-slate-300 bg-white px-3 text-base font-black text-slate-950 shadow-sm disabled:cursor-not-allowed disabled:opacity-60 lg:col-span-1"
        >
          {resetSaving ? '초기화 중' : '전체 초기화'}
        </button>
      </div>
    </section>
  );
}

function CommandBrief({
  mode,
  canEdit,
  openCount,
  congestedCount,
  totalCount,
  lastRefresh
}: {
  mode: 'public' | 'hq';
  canEdit: boolean;
  openCount: number;
  congestedCount: number;
  totalCount: number;
  lastRefresh?: string;
}) {
  const attentionText =
    congestedCount > 0 ? `혼잡 ${congestedCount}개 확인` : openCount > 0 ? `운영중 ${openCount}개` : '운영 준비중';

  return (
    <section className="overflow-hidden rounded-lg bg-gradient-to-br from-[var(--asan-blue)] via-[var(--asan-sky)] to-[var(--asan-green)] text-white shadow-[0_24px_60px_rgba(0,96,176,0.22)]">
      <div className="relative p-5 sm:p-6">
        <div className="absolute right-0 top-0 h-28 w-28 bg-[var(--asan-yellow)]/30 blur-2xl" />
        <div className="absolute bottom-0 left-1/2 h-24 w-48 -translate-x-1/2 bg-[var(--asan-rose)]/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--asan-yellow)]">Live Operations</div>
            <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
              {mode === 'hq' ? '운영본부 관리 모드' : '부스 운영 공개 현황'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-white xl:max-w-3xl">
              {mode === 'hq'
                ? '부스별 운영상태와 혼잡도를 한 화면에서 확인하고 즉시 조정합니다.'
                : '행사 부스의 운영 상태와 혼잡도를 실시간으로 확인할 수 있습니다.'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[420px] xl:min-w-[520px]">
            <BriefMetric label="운영중" value={openCount} />
            <BriefMetric label="혼잡" value={congestedCount} danger={congestedCount > 0} />
            <BriefMetric label="전체" value={totalCount} />
          </div>
        </div>
        <div className="relative mt-5 grid gap-2 sm:grid-cols-3">
          <StatusStrip label="현재 판단" value={attentionText} danger={congestedCount > 0} />
          <StatusStrip label="권한" value={canEdit ? '수정 가능' : '상황 확인 중'} />
          <StatusStrip label="갱신" value={`${formatTime(lastRefresh)} · 5초 주기`} />
        </div>
      </div>
    </section>
  );
}

function BriefMetric({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${danger ? 'bg-orange-500 text-white' : 'bg-white/10 text-white'}`}>
      <div className="text-xs font-black text-white/75">{label}</div>
      <div className="mt-1 text-3xl font-black leading-none">{value}</div>
    </div>
  );
}

function StatusStrip({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${danger ? 'bg-orange-500' : 'bg-white/10'}`}>
      <div className="text-[11px] font-black text-white/70">{label}</div>
      <div className="mt-0.5 truncate text-sm font-black text-white">{value}</div>
    </div>
  );
}

function SectionHeader({ title, count, tone }: { title: string; count?: number; tone?: 'danger' }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className={`text-xl font-black ${tone === 'danger' ? 'text-orange-700' : 'text-slate-950'}`}>{title}</h2>
      {typeof count === 'number' ? (
        <span
          className={`rounded-md px-3 py-1 text-sm font-black ${
            tone === 'danger' ? 'bg-orange-500 text-white' : 'bg-[var(--brand)] text-white'
          }`}
        >
          {count}
        </span>
      ) : null}
    </div>
  );
}
