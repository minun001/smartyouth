'use client';

import { useState } from 'react';
import {
  boothTypeLabels,
  congestionColors,
  congestionLabels,
  congestionSoftColors,
  formatRelativeUpdatedAt,
  materialStatusLabels,
  operationStatusLabels
} from '@/lib/statusLabels';
import type { BoothWithStatus } from '@/lib/types';

type BoothCardProps = {
  booth: BoothWithStatus;
  editable?: boolean;
  defaultExpanded?: boolean;
  onEdit?: (booth: BoothWithStatus) => void;
};

export default function BoothCard({ booth, editable, defaultExpanded = false, onEdit }: BoothCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const status = booth.status;

  return (
    <article
      className={`overflow-hidden rounded-lg border shadow-sm ${
        booth.problem ? 'border-red-200' : 'border-slate-200'
      }`}
      style={{ backgroundColor: congestionSoftColors[status.congestionLevel] }}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        className="flex min-h-20 w-full items-center justify-between gap-3 p-4 text-left active:bg-white/40"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-lg font-black text-white">
            {booth.boothNo}
          </span>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-base font-black text-slate-950">{booth.name}</span>
              {booth.problem ? (
                <span className="shrink-0 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-black text-white">
                  문제
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm font-extrabold text-slate-600">
              <span>{operationStatusLabels[status.operationStatus]}</span>
              <span>·</span>
              <span className="font-black" style={{ color: congestionColors[status.congestionLevel] }}>
                {congestionLabels[status.congestionLevel]}
              </span>
            </div>
          </div>
        </div>
        <span className="shrink-0 text-2xl font-black text-slate-400">{expanded ? '−' : '+'}</span>
      </button>

      {expanded ? (
        <div className="border-t border-white/80 px-4 pb-4 pt-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-black text-slate-500">{boothTypeLabels[booth.type]}</div>
              <h2 className="mt-1 text-lg font-black leading-snug text-slate-950">{booth.name}</h2>
            </div>
            {editable ? (
              <button
                type="button"
                onClick={() => onEdit?.(booth)}
                className="min-h-11 shrink-0 rounded-lg bg-slate-900 px-4 text-sm font-black text-white"
              >
                수정
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <StatusPill label="상태" value={operationStatusLabels[status.operationStatus]} />
            <StatusPill
              label="혼잡"
              value={congestionLabels[status.congestionLevel]}
              color={congestionColors[status.congestionLevel]}
            />
            <StatusPill label="대기" value={status.waitMinutes === 30 ? '30분+' : `${status.waitMinutes}분`} />
            <StatusPill
              label="재료"
              value={materialStatusLabels[status.materialStatus]}
              color={
                status.materialStatus === 'OUT' ? '#ef4444' : status.materialStatus === 'LOW' ? '#f97316' : '#22c55e'
              }
            />
          </div>

          {booth.problemReasons.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {booth.problemReasons.map((reason) => (
                <span key={reason} className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                  {reason}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-3 text-xs font-bold text-slate-500">업데이트 {formatRelativeUpdatedAt(status.updatedAt)}</div>
        </div>
      ) : null}
    </article>
  );
}

function StatusPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-md bg-white/80 px-3 py-2">
      <div className="text-[11px] font-black text-slate-500">{label}</div>
      <div className="mt-0.5 truncate text-base font-black text-slate-900" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}
