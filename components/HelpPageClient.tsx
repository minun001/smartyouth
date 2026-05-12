'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import { appPath, isStaticDemo } from '@/lib/clientConfig';
import { formatTime, helpTypeLabels, incidentStatusLabels } from '@/lib/statusLabels';
import { getStaticStatus, patchStaticIncident, type ClientStatusResponse } from '@/lib/staticDemoClient';
import type { IncidentStatus } from '@/lib/types';

type HelpPageClientProps = {
  token?: string;
};

export default function HelpPageClient({ token }: HelpPageClientProps) {
  const [data, setData] = useState<ClientStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
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
  }, [token]);

  useEffect(() => {
    void loadStatus();
    const id = window.setInterval(() => void loadStatus(), 5000);
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <AppHeader title="도움 요청" lastRefresh={data?.refreshedAt} onRefresh={() => void loadStatus()} />
      <main className="safe-bottom mx-auto max-w-3xl space-y-4 px-4 py-4">
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
              return (
                <section key={group.status} className="space-y-3">
                  <h2 className="text-lg font-black text-slate-950">
                    {group.title} <span className="text-slate-400">{incidents.length}</span>
                  </h2>
                  {incidents.length > 0 ? (
                    incidents.map((incident) => (
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
                            className="min-h-12 rounded-lg bg-slate-900 text-base font-black text-white disabled:opacity-50"
                          >
                            완료
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-lg bg-white p-4 text-sm font-bold text-slate-500">없음</div>
                  )}
                </section>
              );
            })
          : null}
      </main>
      <BottomNav token={token} />
    </div>
  );
}
