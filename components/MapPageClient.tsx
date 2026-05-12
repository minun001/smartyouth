'use client';

import { useCallback, useEffect, useState } from 'react';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import MapView from './MapView';
import { appPath, isStaticDemo } from '@/lib/clientConfig';
import { getStaticStatus, type ClientStatusResponse } from '@/lib/staticDemoClient';

export default function MapPageClient() {
  const [data, setData] = useState<ClientStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <AppHeader title="지도" lastRefresh={data?.refreshedAt} onRefresh={() => void loadStatus()} />
      <main className="safe-bottom mx-auto max-w-3xl space-y-4 px-4 py-4">
        {error ? <div className="rounded-lg bg-red-50 p-4 text-sm font-black text-red-700">{error}</div> : null}
        {data ? (
          <MapView booths={data.booths} />
        ) : (
          <div className="rounded-lg bg-white p-6 text-center text-base font-black text-slate-500">불러오는 중</div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
