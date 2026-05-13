'use client';

import { useEffect, useState } from 'react';
import { appPath } from '@/lib/clientConfig';
import { formatTime } from '@/lib/statusLabels';

type AppHeaderProps = {
  title?: string;
  lastRefresh?: string;
  onRefresh?: () => void;
  onResetAll?: () => void;
  resetDisabled?: boolean;
  resetLoading?: boolean;
  rightLabel?: string;
};

export default function AppHeader({
  title,
  lastRefresh,
  onRefresh,
  onResetAll,
  resetDisabled,
  resetLoading,
  rightLabel
}: AppHeaderProps) {
  const [now, setNow] = useState<string | null>(null);
  const timeText = lastRefresh ? `마지막 새로고침 ${formatTime(lastRefresh)}` : `현재 ${now ? formatTime(now) : '--:--'}`;

  useEffect(() => {
    setNow(new Date().toISOString());
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-white/95 text-slate-950 shadow-[0_8px_26px_rgba(0,96,176,0.10)] backdrop-blur">
      <div className="mx-auto flex min-h-[var(--app-header-height)] w-full max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex h-11 w-[122px] shrink-0 items-center rounded-md bg-white px-2 sm:h-12 sm:w-[154px] sm:px-3">
            <img
              src={appPath('/smartyouth-logo.png')}
              alt="아산시청소년교육문화센터"
              className="h-7 w-auto max-w-[106px] object-contain object-left sm:h-8 sm:max-w-[130px]"
            />
          </div>
          <div className="min-w-0">
            <span className="sr-only">smartyouth</span>
            <div className="hidden truncate text-[11px] font-black uppercase text-[var(--asan-blue)] sm:block">smartyouth</div>
            <div className="truncate text-sm font-black leading-tight sm:text-lg">{title ?? '부스 운영상황'}</div>
            <div className="truncate text-[11px] font-bold text-slate-500 sm:text-xs" suppressHydrationWarning>
              {timeText}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
          {rightLabel ? (
            <span className="hidden rounded-md bg-[var(--asan-yellow)] px-3 py-2 text-xs font-black text-slate-950 sm:inline-flex">
              {rightLabel}
            </span>
          ) : null}
          {onResetAll ? (
            <button
              type="button"
              data-header-reset-all="true"
              onClick={onResetAll}
              disabled={resetDisabled}
              className="min-h-10 rounded-lg bg-gradient-to-r from-red-600 to-orange-500 px-3 text-xs font-black text-white shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-11 sm:px-4 sm:text-sm"
            >
              {resetLoading ? '초기화 중' : '전체 초기화'}
            </button>
          ) : null}
          {onRefresh ? (
            <button
              type="button"
              data-header-refresh="true"
              onClick={onRefresh}
              className="min-h-10 rounded-lg bg-gradient-to-r from-[var(--asan-blue)] to-[var(--asan-sky)] px-3 text-xs font-black text-white active:scale-[0.98] sm:min-h-11 sm:px-4 sm:text-sm"
            >
              새로고침
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
