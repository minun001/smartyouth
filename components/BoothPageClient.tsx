'use client';

import { useCallback, useEffect, useState } from 'react';
import AppHeader from './AppHeader';
import BoothControlPanel from './BoothControlPanel';
import BottomNav from './BottomNav';
import { apiPath, isStaticDemo } from '@/lib/clientConfig';
import { getInitialStaticStatus, getStaticStatus, type ClientStatusResponse } from '@/lib/staticDemoClient';
import type { BoothStatus } from '@/lib/types';
import { useRealtimeRefresh } from '@/lib/useRealtimeRefresh';
import { useUrlToken } from '@/lib/useUrlToken';

type BoothPageClientProps = {
  boothNo: number;
  token?: string;
};

export default function BoothPageClient({ boothNo, token }: BoothPageClientProps) {
  const urlToken = useUrlToken();
  const activeToken = token ?? urlToken ?? undefined;
  const [data, setData] = useState<ClientStatusResponse | null>(() =>
    isStaticDemo ? getInitialStaticStatus(activeToken, boothNo) : null
  );
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      if (isStaticDemo) {
        setData(getStaticStatus(activeToken, boothNo));
        setError(null);
        return;
      }

      const params = new URLSearchParams({ boothNo: String(boothNo) });
      if (activeToken) params.set('t', activeToken);

      const response = await fetch(`${apiPath('/api/status')}?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) {
        setError('부스 상태를 불러오지 못했습니다.');
        return;
      }

      const next = (await response.json()) as ClientStatusResponse;
      setData(next);
      setError(null);
    } catch {
      setError('부스 상태를 불러오지 못했습니다. 네트워크 상태를 확인해주세요.');
    }
  }, [boothNo, activeToken]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useRealtimeRefresh({ enabled: Boolean(data), onRefresh: loadStatus });

  const booth = data?.booths.find((item) => item.boothNo === boothNo);

  function applyLocalStatus(status: BoothStatus) {
    setData((current) => {
      if (!current) return current;
      return {
        ...current,
        booths: current.booths.map((item) => (item.boothNo === status.boothNo ? { ...item, status } : item))
      };
    });
  }

  return (
    <div className="min-h-screen text-slate-950">
      <AppHeader
        title={booth ? `부스 ${booth.boothNo} 운영 패널` : '부스 운영 패널'}
        lastRefresh={data?.refreshedAt}
        onRefresh={() => void loadStatus()}
      />

      <main className="safe-bottom mx-auto max-w-3xl space-y-4 px-4 py-4 sm:py-5">
        {error ? <div className="rounded-lg bg-red-50 p-4 text-sm font-black text-red-700">{error}</div> : null}

        {!data ? (
          <div className="rounded-lg bg-white p-6 text-center text-base font-black text-slate-500">불러오는 중</div>
        ) : null}

        {data && !booth ? (
          <div className="rounded-lg bg-white p-6 text-center text-base font-black text-slate-700">
            해당 부스를 찾을 수 없습니다.
          </div>
        ) : null}

        {booth ? (
          <BoothControlPanel
            booth={booth}
            token={activeToken}
            canEdit={data?.access.canEditBooth ?? false}
            onUpdated={applyLocalStatus}
            onSaved={() => void loadStatus()}
          />
        ) : null}
      </main>

      <BottomNav boothNo={boothNo} token={activeToken} />
    </div>
  );
}
