'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AppHeader from './AppHeader';
import BoothCard from './BoothCard';
import BoothControlPanel from './BoothControlPanel';
import BottomNav from './BottomNav';
import FilterChips from './FilterChips';
import MapView from './MapView';
import SummaryCards from './SummaryCards';
import { appPath, isStaticDemo } from '@/lib/clientConfig';
import { STATUS_REFRESH_INTERVAL_MS } from '@/lib/realtimeConfig';
import { formatTime } from '@/lib/statusLabels';
import { getStaticStatus, type ClientStatusResponse } from '@/lib/staticDemoClient';
import type { BoothStatus, DashboardFilter } from '@/lib/types';

type DashboardViewProps = {
  mode: 'public' | 'hq';
  token?: string | null;
  view?: 'map' | 'overview';
};

export default function DashboardView({ mode, token, view = 'map' }: DashboardViewProps) {
  const [data, setData] = useState<ClientStatusResponse | null>(() => (isStaticDemo ? getStaticStatus(token) : null));
  const [filter, setFilter] = useState<DashboardFilter>('all');
  const [selectedBoothNo, setSelectedBoothNo] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isStaticDemo);

  const loadStatus = useCallback(async () => {
    try {
      if (isStaticDemo) {
        setData(getStaticStatus(token));
        setError(null);
        return;
      }

      const params = new URLSearchParams();
      if (token) params.set('t', token);

      const response = await fetch(`${appPath('/api/status')}${params.toString() ? `?${params.toString()}` : ''}`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        setError('상황을 불러오지 못했습니다.');
        return;
      }

      const next = (await response.json()) as ClientStatusResponse;
      setData(next);
      setError(null);
    } catch {
      setError('상황을 불러오지 못했습니다. 네트워크 상태를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadStatus();
    const id = window.setInterval(() => void loadStatus(), STATUS_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [loadStatus]);

  const canEdit = mode === 'hq' && Boolean(data?.access.hq);
  const selectedBooth = data?.booths.find((booth) => booth.boothNo === selectedBoothNo);
  const problemBooths = useMemo(() => data?.booths.filter((booth) => booth.problem) ?? [], [data]);
  const helpCount = useMemo(
    () => data?.booths.filter((booth) => booth.status.helpRequested).length ?? 0,
    [data]
  );
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
        booths: current.booths.map((booth) =>
          booth.boothNo === status.boothNo ? { ...booth, status } : booth
        )
      };
    });
  }

  const isMapView = view === 'map';

  return (
    <div className="min-h-screen text-slate-950">
      <AppHeader
        title={isMapView ? '운영 상황' : mode === 'hq' ? '전체 상황 관리' : '전체 상황'}
        lastRefresh={data?.refreshedAt}
        onRefresh={() => void loadStatus()}
      />

      <main
        className={
          isMapView
            ? 'h-[calc(100dvh-76px)] overflow-hidden bg-slate-100'
            : 'safe-bottom mx-auto max-w-6xl space-y-4 px-4 py-4 sm:py-5'
        }
      >
        {mode === 'hq' && data && !data.access.hq ? (
          <section className="m-4 rounded-lg border border-red-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-black text-red-600">수정 권한 없음</div>
            <h1 className="mt-2 text-2xl font-black leading-tight text-slate-950">운영본부 전용 링크입니다.</h1>
            <p className="mt-3 text-sm font-bold leading-6 text-slate-600">
              HQ 화면은 전달받은 운영본부 링크로 접속해야 수정할 수 있습니다. 주소 끝에 HQ 토큰이 포함된
              `/hq?t=...` 링크인지 확인해주세요.
            </p>
            {isStaticDemo ? (
              <a
                href={appPath('/hq?t=demo-hq')}
                className="mt-4 flex min-h-12 items-center justify-center rounded-lg bg-slate-900 text-base font-black text-white"
              >
                HQ 화면 열기
              </a>
            ) : null}
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
                ? 'flex h-full items-center justify-center bg-white text-base font-black text-slate-500'
                : 'rounded-lg bg-white p-6 text-center text-base font-black text-slate-500'
            }
          >
            불러오는 중
          </div>
        ) : null}

        {data && !(mode === 'hq' && !data.access.hq) ? (
          isMapView ? (
            <>
              <MapView
                booths={data.booths}
                editable={canEdit}
                fullScreen
                showProblemList={false}
                onEdit={(selected) => setSelectedBoothNo(selected.boothNo)}
              />
              {selectedBooth && canEdit ? (
                <BoothControlPanel
                  booth={selectedBooth}
                  token={token}
                  canEdit={canEdit}
                  onClose={() => setSelectedBoothNo(null)}
                  onUpdated={applyLocalStatus}
                  onSaved={() => void loadStatus()}
                />
              ) : null}
            </>
          ) : (
            <>
              <CommandBrief
                mode={mode}
                canEdit={canEdit}
                problemCount={problemBooths.length}
                helpCount={helpCount}
                congestedCount={congestedCount}
                totalCount={data.booths.length}
                lastRefresh={data.refreshedAt}
                helpHref={canEdit ? appPath(`/help${token ? `?t=${encodeURIComponent(token)}` : ''}`) : undefined}
              />
              <SummaryCards booths={data.booths} />

              {problemBooths.length > 0 ? (
                <section className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
                  <SectionHeader title="즉시 확인" count={problemBooths.length} tone="danger" />
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    {problemBooths.slice(0, 4).map((booth) => (
                      <BoothCard
                        key={booth.boothNo}
                        booth={booth}
                        editable={canEdit}
                        defaultExpanded={problemBooths.length <= 2}
                        onEdit={(selected) => setSelectedBoothNo(selected.boothNo)}
                      />
                    ))}
                  </div>
                  {problemBooths.length > 4 ? (
                    <button
                      type="button"
                      onClick={() => setFilter('problem')}
                      className="mt-3 min-h-12 w-full rounded-lg bg-red-600 text-base font-black text-white"
                    >
                      문제 부스 {problemBooths.length}개 전체 보기
                    </button>
                  ) : null}
                </section>
              ) : (
                <section className="rounded-lg border border-sky-200 bg-sky-50 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black text-[var(--brand-strong)]">현재 즉시 대응 부스 없음</h2>
                      <p className="mt-1 text-sm font-bold text-sky-800">
                        혼잡, 도움 요청, 재료 부족, 일시중단 상태를 계속 감시 중입니다.
                      </p>
                    </div>
                    <span className="rounded-md bg-[var(--asan-green)] px-3 py-2 text-sm font-black text-white">
                      정상
                    </span>
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <SectionHeader title="전체 부스" count={visibleBooths.length} />
                <FilterChips active={filter} onChange={setFilter} />
              </section>

              {selectedBooth && canEdit ? (
                <BoothControlPanel
                  booth={selectedBooth}
                  token={token}
                  canEdit={canEdit}
                  onClose={() => setSelectedBoothNo(null)}
                  onUpdated={applyLocalStatus}
                  onSaved={() => void loadStatus()}
                />
              ) : null}

              <section className="space-y-3">
                {visibleBooths.length > 0 ? (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {visibleBooths.map((booth) => (
                      <BoothCard
                        key={booth.boothNo}
                        booth={booth}
                        editable={canEdit}
                        onEdit={(selected) => setSelectedBoothNo(selected.boothNo)}
                      />
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

function CommandBrief({
  mode,
  canEdit,
  problemCount,
  helpCount,
  congestedCount,
  totalCount,
  lastRefresh,
  helpHref
}: {
  mode: 'public' | 'hq';
  canEdit: boolean;
  problemCount: number;
  helpCount: number;
  congestedCount: number;
  totalCount: number;
  lastRefresh?: string;
  helpHref?: string;
}) {
  const attentionText =
    problemCount > 0
      ? `문제 ${problemCount}개, 도움 ${helpCount}건`
      : mode === 'hq'
        ? '현장 이상 신호 없음'
        : '운영 상태 공개 확인';

  return (
    <section className="overflow-hidden rounded-lg bg-gradient-to-br from-[var(--asan-blue)] via-[var(--asan-sky)] to-[var(--asan-green)] text-white shadow-[0_24px_60px_rgba(0,96,176,0.22)]">
      <div className="relative p-5 sm:p-6">
        <div className="absolute right-0 top-0 h-28 w-28 bg-[var(--asan-yellow)]/30 blur-2xl" />
        <div className="absolute bottom-0 left-1/2 h-24 w-48 -translate-x-1/2 bg-[var(--asan-rose)]/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--asan-yellow)]">Live Operations</div>
            <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
              {mode === 'hq' ? '운영본부 관제 모드' : '부스 운영 공개 현황'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-white">
              {mode === 'hq'
                ? '문제 부스, 도움 요청, 혼잡도를 한 화면에서 확인하고 즉시 조치합니다.'
                : '행사장 부스 운영 상태와 혼잡도를 실시간으로 확인할 수 있습니다.'}
            </p>
            {helpHref ? (
              <a
                href={helpHref}
                className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-white px-4 text-sm font-black text-[var(--brand)]"
              >
                도움 요청 큐 열기
              </a>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
            <BriefMetric label="주의" value={problemCount} danger={problemCount > 0} />
            <BriefMetric label="혼잡" value={congestedCount} danger={congestedCount > 0} />
            <BriefMetric label="전체" value={totalCount} />
          </div>
        </div>
        <div className="relative mt-5 grid gap-2 sm:grid-cols-3">
          <StatusStrip label="현재 판단" value={attentionText} danger={problemCount > 0} />
          <StatusStrip label="권한" value={canEdit ? 'HQ 수정 가능' : mode === 'hq' ? '토큰 확인 필요' : '읽기 전용'} />
          <StatusStrip label="갱신" value={`${formatTime(lastRefresh)} · 2초 주기`} />
        </div>
      </div>
    </section>
  );
}

function BriefMetric({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${danger ? 'bg-red-500 text-white' : 'bg-white/10 text-white'}`}>
      <div className="text-xs font-black text-white/75">{label}</div>
      <div className="mt-1 text-3xl font-black leading-none">{value}</div>
    </div>
  );
}

function StatusStrip({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${danger ? 'bg-red-500' : 'bg-white/10'}`}>
      <div className="text-[11px] font-black text-white/70">{label}</div>
      <div className="mt-0.5 truncate text-sm font-black text-white">{value}</div>
    </div>
  );
}

function SectionHeader({ title, count, tone }: { title: string; count?: number; tone?: 'danger' }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className={`text-xl font-black ${tone === 'danger' ? 'text-red-700' : 'text-slate-950'}`}>{title}</h2>
      {typeof count === 'number' ? (
        <span
          className={`rounded-md px-3 py-1 text-sm font-black ${
            tone === 'danger' ? 'bg-red-600 text-white' : 'bg-[var(--brand)] text-white'
          }`}
        >
          {count}
        </span>
      ) : null}
    </div>
  );
}
