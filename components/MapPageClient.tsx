'use client';

import { useCallback, useEffect, useState } from 'react';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import MapView from './MapView';
import { appPath, isStaticDemo } from '@/lib/clientConfig';
import { STATUS_REFRESH_INTERVAL_MS } from '@/lib/realtimeConfig';
import { getInitialStaticStatus, getStaticStatus, type ClientStatusResponse } from '@/lib/staticDemoClient';

export default function MapPageClient() {
  const [data, setData] = useState<ClientStatusResponse | null>(() => (isStaticDemo ? getInitialStaticStatus() : null));
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      if (isStaticDemo) {
        setData(getStaticStatus());
        setError(null);
        return;
      }

      const response = await fetch(appPath('/api/status'), { cache: 'no-store' });
      if (!response.ok) {
        setError('지도 정보를 불러오지 못했습니다.');
        return;
      }
      setData((await response.json()) as ClientStatusResponse);
      setError(null);
    } catch {
      setError('지도 정보를 불러오지 못했습니다. 네트워크 상태를 확인해주세요.');
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    const id = window.setInterval(() => void loadStatus(), STATUS_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [loadStatus]);

  return (
    <div className="min-h-screen text-slate-950">
      <AppHeader title="운영 상황" lastRefresh={data?.refreshedAt} onRefresh={() => void loadStatus()} />
      <main className="h-[calc(100dvh-var(--app-header-height))] overflow-hidden bg-slate-100 pb-[calc(env(safe-area-inset-bottom)+var(--bottom-nav-height))]">
        {error ? <div className="m-4 rounded-lg bg-red-50 p-4 text-sm font-black text-red-700">{error}</div> : null}
        {data ? (
          <MapView booths={data.booths} fullScreen showProblemList={false} />
        ) : (
          <div className="flex h-full items-center justify-center bg-white text-base font-black text-slate-500">
            불러오는 중
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
