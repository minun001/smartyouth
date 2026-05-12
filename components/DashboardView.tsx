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
};

export default function DashboardView({ mode, token }: DashboardViewProps) {
  const [data, setData] = useState<ClientStatusResponse | null>(null);
  const [filter, setFilter] = useState<DashboardFilter>('all');
  const [selectedBoothNo, setSelectedBoothNo] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    if (isStaticDemo) {
      setData(getStaticStatus(token));
      setError(null);
      setLoading(false);
      return;
    }

    const params = new URLSearchParams();
    if (token) params.set('t', token);

    const response = await fetch(`${appPath('/api/status')}${params.toString() ? `?${params.toString()}` : ''}`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      setError('상황을 불러오지 못했습니다.');
      setLoading(false);
      return;
    }

    const next = (await response.json()) as ClientStatusResponse;
    setData(next);
    setError(null);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    void loadStatus();
    const id = window.setInterval(() => void loadStatus(), STATUS_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [loadStatus]);

  const canEdit = mode === 'hq' && Boolean(data?.access.hq);
  const selectedBooth = data?.booths.find((booth) => booth.boothNo === selectedBoothNo);

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <AppHeader
        title={mode === 'hq' ? '운영본부 상황판' : '전체 상황판'}
        lastRefresh={data?.refreshedAt}
        onRefresh={() => void loadStatus()}
        rightLabel={data?.mode === 'demo' ? '데모' : undefined}
      />

      <main className="safe-bottom mx-auto max-w-3xl space-y-4 px-4 py-4">
        {mode === 'hq' && data && !data.access.hq ? (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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
                데모 HQ 열기
              </a>
            ) : null}
          </section>
        ) : null}

        {error ? <div className="rounded-lg bg-red-50 p-4 text-sm font-black text-red-700">{error}</div> : null}

        {loading && !data ? (
          <div className="rounded-lg bg-white p-6 text-center text-base font-black text-slate-500">불러오는 중</div>
        ) : null}

        {data && !(mode === 'hq' && !data.access.hq) ? (
          <>
            <SummaryCards booths={data.booths} />

            <section className="space-y-3">
              <h2 className="text-lg font-black text-slate-950">부스 지도</h2>
              <MapView
                booths={data.booths}
                editable={canEdit}
                showProblemList={false}
                onEdit={(selected) => setSelectedBoothNo(selected.boothNo)}
              />
            </section>

            <FilterChips active={filter} onChange={setFilter} />

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
                visibleBooths.map((booth) => (
                  <BoothCard
                    key={booth.boothNo}
                    booth={booth}
                    editable={canEdit}
                    onEdit={(selected) => setSelectedBoothNo(selected.boothNo)}
                  />
                ))
              ) : (
                <div className="rounded-lg bg-white p-5 text-center text-sm font-bold text-slate-500">
                  표시할 부스가 없습니다.
                </div>
              )}
            </section>

            {canEdit ? (
              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-lg font-black text-slate-950">최근 변경</h2>
                <div className="mt-3 space-y-2">
                  {data.recentChanges.length > 0 ? (
                    data.recentChanges.map((change) => (
                      <div key={change.id} className="rounded-md bg-slate-50 p-3 text-sm font-bold text-slate-600">
                        <span className="font-black text-slate-950">부스 {change.boothNo}</span> · {change.field} ·{' '}
                        {change.oldValue ?? '-'} → {change.newValue ?? '-'} · {formatTime(change.createdAt)}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm font-bold text-slate-500">아직 변경 기록이 없습니다.</div>
                  )}
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </main>

      <BottomNav token={token} hqMode={canEdit} />
    </div>
  );
}
