'use client';

import { formatTime } from '@/lib/statusLabels';

type AppHeaderProps = {
  title?: string;
  lastRefresh?: string;
  onRefresh?: () => void;
  rightLabel?: string;
};

export default function AppHeader({ title, lastRefresh, onRefresh, rightLabel }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-[64px] w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="text-xl font-black tracking-normal text-slate-950">smartyouth</div>
          <div className="truncate text-xs font-semibold text-slate-500">
            {title ?? '2026 아산 청소년 페스타'}
            {lastRefresh ? ` · 마지막 새로고침 ${formatTime(lastRefresh)}` : ` · 현재 ${formatTime()}`}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {rightLabel ? (
            <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">{rightLabel}</span>
          ) : null}
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className="min-h-11 rounded-lg bg-slate-900 px-4 text-sm font-extrabold text-white shadow-soft active:scale-[0.98]"
            >
              새로고침
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
