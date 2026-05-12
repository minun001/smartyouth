'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import { appPath, isStaticDemo } from '@/lib/clientConfig';
import { STATUS_REFRESH_INTERVAL_MS } from '@/lib/realtimeConfig';
import { formatTime, helpTypeLabels, incidentStatusLabels } from '@/lib/statusLabels';
import { getStaticStatus, patchStaticIncident, type ClientStatusResponse } from '@/lib/staticDemoClient';
import type { IncidentStatus } from '@/lib/types';

type HelpPageClientProps = {
  token?: string;
};

export default function HelpPageClient({ token }: HelpPageClientProps) {
  const [data, setData] = useState<ClientStatusResponse | null>(() => (isStaticDemo ? getStaticStatus(token) : null));
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      if (isStaticDemo) {
        setData(getStaticStatus(token));
        setError(null);
        return;
      }

      const params = new URLSearchParams();
      if (token) params.set('t', token);
      const response = await fetch(`${appPath('/api/status')}${params.toString() ? `?${params.toString()}` : ''}`, { cache: 'no-store' });
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
    const id = window.setInterval(() => void loadStatus(), STATUS_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [loadStatus]);

  const boothNameByNo = useMemo(() => {
    return new Map(data?.booths.map((booth) => [booth.boothNo, booth.name]) ?? []);
  }, [data]);

  async function setIncidentStatus(id: string, status: IncidentStatus) {
    if (!data?.access.hq) return;
    setSavingId(id);

    if (isStaticDemo) {
      try {
        await patchStaticIncident(token, id, status);
        await loadStatus();
      } catch {
        setError('저장 실패. 다시 시도해주세요.');
      } finally {
        setSavingId(null);
      }
      return;
    }

    const suffix = token ? `?t=${encodeURIComponent(token)}` : '';
    const response = await fetch(`${appPath(`/api/incidents/${id}`)}${suffix}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    setSavingId(null);

    if (!response.ok) {
      setError('저장 실패. 다시 시도해주세요.');
      return;
    }

    await loadStatus();
  }

  const groups: { status: IncidentStatus; title: string }[] = [
    { status: 'NEW', title: '새 요청' },
    { status: 'IN_PROGRESS', title: '처리중' },
    { status: 'RESOLVED', title: '완료' }
  ];
  const newCount = data?.incidents.filter((incident) => incident.status === 'NEW').length ?? 0;
  const progressCount = data?.incidents.filter((incident) => incident.status === 'IN_PROGRESS').length ?? 0;

  return (
    <div className="min-h-screen text-slate-950">
      <AppHeader title="도움 요청 처리 큐" lastRefresh={data?.refreshedAt} onRefresh={() => void loadStatus()} />
      <main className="safe-bottom mx-auto max-w-6xl space-y-4 px-4 py-4 sm:py-5">
        <section className="rounded-lg bg-gradient-to-br from-[var(--asan-blue)] via-[var(--asan-sky)] to-[var(--asan-green)] p-5 text-white shadow-[0_24px_60px_rgba(0,96,176,0.22)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--asan-yellow)]">HQ Help Queue</div>
              <h1 className="mt-2 text-3xl font-black leading-tight">현장 도움 요청</h1>
              <p className="mt-2 text-sm font-bold text-white">새 요청을 놓치지 않고 처리 상태를 바로 갱신합니다.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:min-w-[240px]">
              <QueueMetric label="새 요청" value={newCount} danger={newCount > 0} />
              <QueueMetric label="처리중" value={progressCount} />
            </div>
          </div>
        </section>

        {data && !data.access.hq ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-black text-red-700">
            HQ 수정 권한이 없는 링크입니다. HQ 토큰을 확인해주세요.
          </div>
        ) : null}

        {error ? <div className="rounded-lg bg-red-50 p-4 text-sm font-black text-red-700">{error}</div> : null}

        {!data ? (
          <div className="rounded-lg bg-white p-6 text-center text-base font-black text-slate-500">불러오는 중</div>
        ) : null}

        {data
          ? groups.map((group) => {
              const incidents = data.incidents.filter((incident) => incident.status === group.status);
              const isNew = group.status === 'NEW';
              return (
                <section
                  key={group.status}
                  className={`space-y-3 rounded-lg border p-4 shadow-sm ${
                    isNew && incidents.length > 0 ? 'border-red-200 bg-red-50' : 'border-[var(--line)] bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className={`text-xl font-black ${isNew ? 'text-red-700' : 'text-slate-950'}`}>{group.title}</h2>
                    <span className={`${isNew ? 'bg-red-600' : 'bg-[var(--brand)]'} rounded-md px-3 py-1 text-sm font-black text-white`}>
                      {incidents.length}
                    </span>
                  </div>
                  {incidents.length > 0 ? (
                    <div className="grid gap-3 lg:grid-cols-2">
                      {incidents.map((incident) => (
                      <article key={incident.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-black text-slate-500">부스 {incident.boothNo}</div>
                            <div className="mt-1 text-lg font-black leading-snug text-slate-950">
                              {boothNameByNo.get(incident.boothNo) ?? '부스'}
                            </div>
                          </div>
                          <div className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                            {helpTypeLabels[incident.type]}
                          </div>
                        </div>
                        {incident.memo ? (
                          <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm font-bold text-slate-700">{incident.memo}</div>
                        ) : null}
                        <div className="mt-3 text-xs font-bold text-slate-500">
                          {incidentStatusLabels[incident.status]} · 요청 {formatTime(incident.createdAt)}
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={!data.access.hq || savingId === incident.id || incident.status === 'IN_PROGRESS'}
                            onClick={() => void setIncidentStatus(incident.id, 'IN_PROGRESS')}
                            className="min-h-12 rounded-lg border border-slate-200 bg-white text-base font-black text-slate-700 disabled:opacity-50"
                          >
                            처리중
                          </button>
                          <button
                            type="button"
                            disabled={!data.access.hq || savingId === incident.id || incident.status === 'RESOLVED'}
                            onClick={() => void setIncidentStatus(incident.id, 'RESOLVED')}
                            className="min-h-12 rounded-lg bg-gradient-to-r from-[var(--asan-blue)] to-[var(--asan-sky)] text-base font-black text-white disabled:opacity-50"
                          >
                            완료
                          </button>
                        </div>
                      </article>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg bg-white p-4 text-sm font-bold text-slate-500">없음</div>
                  )}
                </section>
              );
            })
          : null}
      </main>
      <BottomNav token={token} hqMode={data?.access.hq ?? false} />
    </div>
  );
}

function QueueMetric({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${danger ? 'bg-red-500 text-white' : 'bg-white/10 text-white'}`}>
      <div className="text-xs font-black text-white/75">{label}</div>
      <div className="mt-1 text-3xl font-black leading-none">{value}</div>
    </div>
  );
}
