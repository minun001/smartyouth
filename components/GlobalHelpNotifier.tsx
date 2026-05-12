'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiPath, appPath, isStaticDemo } from '@/lib/clientConfig';
import { getHelpQueueHref } from '@/lib/helpNavigation';
import { REALTIME_FALLBACK_REFRESH_INTERVAL_MS } from '@/lib/realtimeConfig';
import { getStaticStatus, type ClientStatusResponse } from '@/lib/staticDemoClient';
import { formatTime, helpTypeLabels } from '@/lib/statusLabels';
import type { Incident } from '@/lib/types';
import { useRealtimeRefresh } from '@/lib/useRealtimeRefresh';

type HelpNotice = Incident & {
  boothName?: string;
};

export default function GlobalHelpNotifier() {
  const [notice, setNotice] = useState<HelpNotice | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(
    'unsupported'
  );
  const initializedRef = useRef(false);
  const knownIncidentIdsRef = useRef<Set<string>>(new Set());

  const currentRoute = useMemo(() => {
    if (typeof window === 'undefined') return { pathname: '', token: null };
    return {
      pathname: window.location.pathname,
      token: new URLSearchParams(window.location.search).get('t')
    };
  }, []);
  const currentToken = currentRoute.token;

  const helpHref = useMemo(() => {
    return getHelpQueueHref({
      pathname: currentRoute.pathname,
      staticDemo: isStaticDemo,
      token: currentToken
    });
  }, [currentRoute.pathname, currentToken]);

  const loadStatus = useCallback(async (): Promise<ClientStatusResponse | null> => {
    if (isStaticDemo) return getStaticStatus(currentToken);

    try {
      const params = new URLSearchParams();
      if (currentToken) params.set('t', currentToken);
      const response = await fetch(`${apiPath('/api/status')}${params.toString() ? `?${params.toString()}` : ''}`, {
        cache: 'no-store'
      });
      if (!response.ok) return null;
      return (await response.json()) as ClientStatusResponse;
    } catch {
      return null;
    }
  }, [currentToken]);

  const notify = useCallback((nextNotice: HelpNotice) => {
    setNotice(nextNotice);

    if ('vibrate' in navigator) {
      navigator.vibrate([140, 80, 140]);
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('새 도움 요청', {
        body: `부스 ${nextNotice.boothNo} · ${helpTypeLabels[nextNotice.type]}`,
        icon: appPath('/favicon.png'),
        tag: nextNotice.id
      });
    }
  }, []);

  const checkForNewHelp = useCallback(async () => {
    const data = await loadStatus();
    if (!data) return;

    const boothNameByNo = new Map(data.booths.map((booth) => [booth.boothNo, booth.name]));
    const activeHelp = data.incidents
      .filter((incident) => incident.status === 'NEW')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (!initializedRef.current) {
      knownIncidentIdsRef.current = new Set(activeHelp.map((incident) => incident.id));
      initializedRef.current = true;
      return;
    }

    const newest = activeHelp.find((incident) => !knownIncidentIdsRef.current.has(incident.id));
    for (const incident of activeHelp) {
      knownIncidentIdsRef.current.add(incident.id);
    }

    if (newest) {
      notify({ ...newest, boothName: boothNameByNo.get(newest.boothNo) });
    }
  }, [loadStatus, notify]);

  useEffect(() => {
    setNotificationPermission('Notification' in window ? Notification.permission : 'unsupported');
    void checkForNewHelp();
    const onHelpSignal = () => void checkForNewHelp();
    window.addEventListener('storage', onHelpSignal);
    window.addEventListener('smartyouth-help-created', onHelpSignal);

    return () => {
      window.removeEventListener('storage', onHelpSignal);
      window.removeEventListener('smartyouth-help-created', onHelpSignal);
    };
  }, [checkForNewHelp]);

  useRealtimeRefresh({
    enabled: true,
    onRefresh: checkForNewHelp,
    fallbackMs: REALTIME_FALLBACK_REFRESH_INTERVAL_MS
  });

  async function enableBrowserNotification() {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  }

  if (!notice) return null;

  return (
    <aside
      role="status"
      aria-live="assertive"
      className="fixed inset-x-3 top-[84px] z-50 mx-auto max-w-md rounded-lg border border-red-200 bg-white p-4 text-slate-950 shadow-[0_18px_48px_rgba(15,23,42,0.26)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-black text-red-600">새 도움 요청</div>
          <div className="mt-1 truncate text-lg font-black">
            부스 {notice.boothNo} · {helpTypeLabels[notice.type]}
          </div>
          <div className="mt-1 truncate text-sm font-bold text-slate-600">
            {notice.boothName ?? '부스 정보 확인 필요'}
          </div>
          {notice.memo ? <div className="mt-2 text-sm font-bold leading-5 text-slate-700">{notice.memo}</div> : null}
          <div className="mt-2 text-xs font-bold text-slate-500">{formatTime(notice.createdAt)}</div>
        </div>
        <button
          type="button"
          onClick={() => setNotice(null)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xl font-black text-slate-700"
          aria-label="도움 요청 알림 닫기"
        >
          x
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Link
          href={helpHref}
          className="flex min-h-11 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-black text-white"
        >
          도움 보기
        </Link>
        {notificationPermission === 'default' ? (
          <button
            type="button"
            onClick={() => void enableBrowserNotification()}
            className="min-h-11 rounded-lg bg-slate-900 px-4 text-sm font-black text-white"
          >
            브라우저 알림 켜기
          </button>
        ) : null}
      </div>
    </aside>
  );
}
